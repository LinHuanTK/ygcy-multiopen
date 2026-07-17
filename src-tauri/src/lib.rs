use aes_gcm::{Aes256Gcm, KeyInit, Nonce};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use rand::Rng;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::sync::Mutex;
use tauri::{Manager, State};

const KEYRING_SERVICE: &str = "com.ygcy.fingerprint-browser";
const KEYRING_USER: &str = "db-key";

fn derive_aes_key(password: &str) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(b"ygcy-fingerprint-browser-2026");
    hasher.update(password.as_bytes());
    let result = hasher.finalize();
    let mut key = [0u8; 32];
    key.copy_from_slice(&result);
    key
}

fn store_key_in_keychain(aes_key: &[u8; 32]) -> Result<(), String> {
    // 用 base64 编码密钥再存入 Keychain（二进制数据需要编码）
    let b64 = BASE64.encode(aes_key);
    let status = std::process::Command::new("security")
        .args([
            "add-generic-password",
            "-s", KEYRING_SERVICE,
            "-a", KEYRING_USER,
            "-w", &b64,
            "-U", // 允许覆盖
        ])
        .output()
        .map_err(|e| format!("security命令执行失败: {}", e))?;
    if !status.status.success() {
        let stderr = String::from_utf8_lossy(&status.stderr);
        return Err(format!("Keychain写入失败: {}", stderr));
    }
    Ok(())
}

fn read_key_from_keychain() -> Result<[u8; 32], String> {
    let out = std::process::Command::new("security")
        .args(["find-generic-password", "-s", KEYRING_SERVICE, "-a", KEYRING_USER, "-w"])
        .output().map_err(|e| format!("security命令失败: {}", e))?;
    if !out.status.success() {
        return Err("Keychain中未找到密钥".to_string());
    }
    let b64 = String::from_utf8_lossy(&out.stdout).trim().to_string();
    let decoded = BASE64.decode(&b64).map_err(|e| format!("解码失败: {}", e))?;
    if decoded.len() != 32 { return Err("密钥长度不正确".to_string()); }
    let mut key = [0u8; 32];
    key.copy_from_slice(&decoded);
    Ok(key)
}

fn keychain_has_key() -> bool { read_key_from_keychain().is_ok() }

struct Crypto { key: [u8; 32] }

impl Crypto {
    fn from_key(key: [u8; 32]) -> Self { Self { key } }

    fn encrypt(&self, plaintext: &str) -> String {
        use aes_gcm::aead::Aead;
        let mut rng = rand::thread_rng();
        let nonce_bytes: [u8; 12] = rng.gen();
        let nonce = Nonce::from_slice(&nonce_bytes);
        let key = aes_gcm::Key::<Aes256Gcm>::from_slice(&self.key);
        let cipher = Aes256Gcm::new(key);
        let ct = cipher.encrypt(nonce, plaintext.as_bytes()).expect("加密失败");
        let mut combined = Vec::with_capacity(12 + ct.len());
        combined.extend_from_slice(&nonce_bytes);
        combined.extend_from_slice(&ct);
        BASE64.encode(&combined)
    }

    fn decrypt(&self, encoded: &str) -> Result<String, String> {
        use aes_gcm::aead::Aead;
        let combined = BASE64.decode(encoded).map_err(|e| format!("解码失败: {}", e))?;
        if combined.len() < 12 { return Err("数据损坏".to_string()); }
        let (nb, ct) = combined.split_at(12);
        let nonce = Nonce::from_slice(nb);
        let key = aes_gcm::Key::<Aes256Gcm>::from_slice(&self.key);
        let cipher = Aes256Gcm::new(key);
        let pt = cipher.decrypt(nonce, ct).map_err(|_| "解密失败".to_string())?;
        String::from_utf8(pt).map_err(|_| "解码失败".to_string())
    }
}

fn create_memory_db() -> Result<Connection, String> {
    Connection::open_in_memory().map_err(|e| e.to_string())
}

fn now_str() -> String {
    chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string()
}

fn hash_password(password: &str) -> String {
    let mut h = Sha256::new();
    h.update(b"ygcy-salt-2026");
    h.update(password.as_bytes());
    format!("{:x}", h.finalize())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrowserEnv {
    pub id: String, pub name: String, pub platform: String, pub account: String,
    pub password: Option<String>, pub browser: String, pub proxy_id: String,
    pub proxy: String, pub exit_ip: String, pub country: String, pub extensions: String,
    pub status: String, pub created_at: String, pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyEntry {
    pub id: String, pub name: String, pub proxy_type: String, pub host: String,
    pub port: i32, pub username: String, pub password: String, pub region: String,
    pub isp: String, pub status: String, pub latency: i32, pub used_count: i32, pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User { pub id: String, pub username: String, pub role: String, pub created_at: String, }

#[derive(Debug, Serialize, Deserialize)]
pub struct LogEntry { pub id: i64, pub time: String, pub level: String, pub message: String, }

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthResult { pub success: bool, pub user: Option<User>, pub error: Option<String>, }

pub struct AppState {
    pub db: Mutex<Connection>,
    pub crypto: Crypto,
    pub db_path: std::path::PathBuf,
}

fn init_tables(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS browser_envs (id TEXT PRIMARY KEY, data TEXT NOT NULL);
         CREATE TABLE IF NOT EXISTS proxies (id TEXT PRIMARY KEY, data TEXT NOT NULL);
         CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY AUTOINCREMENT, time TEXT NOT NULL, level TEXT NOT NULL, message TEXT NOT NULL);
         CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user', created_at TEXT NOT NULL);"
    ).map_err(|e| e.to_string())?;
    Ok(())
}

fn init_users(conn: &Connection) -> Result<(), String> {
    let c: i64 = conn.query_row("SELECT COUNT(*) FROM users WHERE username='root'", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    if c == 0 {
        conn.execute(
            "INSERT INTO users(id,username,password_hash,role,created_at) VALUES(?1,'root',?2,'admin',?3)",
            params![&uuid::Uuid::new_v4().to_string(), &hash_password("RZCY&ttpulin@2026"), &now_str()],
        ).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn seed_data(conn: &Connection, crypto: &Crypto) -> Result<(), String> {
    for (id, json) in &[
        ("p1", r#"{"name":"北京联通","proxy_type":"HTTP","host":"127.0.0.1","port":7890,"region":"北京","isp":"联通"}"#),
        ("p2", r#"{"name":"上海电信","proxy_type":"SOCKS5","host":"192.168.1.100","port":1080,"region":"上海","isp":"电信"}"#),
    ] {
        conn.execute("INSERT INTO proxies(id,data) VALUES(?1,?2) ON CONFLICT DO NOTHING",
            params![id, &crypto.encrypt(json)]).ok();
    }
    for (id, json) in &[
        ("ENV-001", r#"{"name":"B站矩阵","platform":"bilibili","account":"bili@163.com","browser":"Chrome 126","proxy_id":"p1","proxy":"HTTP","exit_ip":"中国","country":"中国","extensions":"2","status":"running"}"#),
        ("ENV-002", r#"{"name":"抖音矩阵","platform":"douyin","account":"douyin@qq.com","browser":"Edge 125","proxy_id":"p2","proxy":"SOCKS5","exit_ip":"新加坡","country":"新加坡","extensions":"0","status":"stopped"}"#),
    ] {
        conn.execute("INSERT INTO browser_envs(id,data) VALUES(?1,?2) ON CONFLICT DO NOTHING",
            params![id, &crypto.encrypt(json)]).ok();
    }
    Ok(())
}

fn load_or_create_db(path: &std::path::Path, crypto: &Crypto) -> Result<Connection, String> {
    if path.exists() {
        let enc = std::fs::read_to_string(path).map_err(|e| format!("读文件失败: {}", e))?;
        match crypto.decrypt(&enc) {
            Ok(plain) => {
                let db = create_memory_db()?;
                if plain.len() > 100 {
                    let tmp = path.with_extension("tmp");
                    std::fs::write(&tmp, &plain).map_err(|e| format!("写临时文件失败: {}", e))?;
                    db.execute_batch(&format!("ATTACH DATABASE '{}' AS src;", tmp.to_string_lossy().replace("'", "''")))
                        .map_err(|e| e.to_string())?;
                    db.execute_batch("CREATE TABLE browser_envs AS SELECT * FROM src.browser_envs;").ok();
                    db.execute_batch("CREATE TABLE proxies AS SELECT * FROM src.proxies;").ok();
                    db.execute_batch("CREATE TABLE logs AS SELECT * FROM src.logs;").ok();
                    db.execute_batch("CREATE TABLE users AS SELECT * FROM src.users;").ok();
                    db.execute_batch("DETACH DATABASE src;").map_err(|e| e.to_string())?;
                    std::fs::remove_file(&tmp).ok();
                }
                Ok(db)
            }
            Err(_) => {
                // 解密失败，删除旧文件重建
                let _ = std::fs::remove_file(path);
                let db = create_memory_db()?;
                init_tables(&db)?; init_users(&db)?; seed_data(&db, crypto)?;
                Ok(db)
            }
        }
    } else {
        let db = create_memory_db()?;
        init_tables(&db)?; init_users(&db)?; seed_data(&db, crypto)?;
        Ok(db)
    }
}

fn save_db(state: &AppState) -> Result<(), String> {
    let tmp = state.db_path.with_extension("tmp");
    {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        db.execute_batch(&format!("ATTACH DATABASE '{}' AS bak;", tmp.to_string_lossy().replace("'", "''")))
            .map_err(|e| e.to_string())?;
        db.execute_batch("CREATE TABLE IF NOT EXISTS bak.browser_envs AS SELECT * FROM browser_envs;").ok();
        db.execute_batch("CREATE TABLE IF NOT EXISTS bak.proxies AS SELECT * FROM proxies;").ok();
        db.execute_batch("CREATE TABLE IF NOT EXISTS bak.logs AS SELECT * FROM logs;").ok();
        db.execute_batch("CREATE TABLE IF NOT EXISTS bak.users AS SELECT * FROM users;").ok();
        db.execute_batch("DETACH DATABASE bak;").map_err(|e| e.to_string())?;
    }
    let bytes = std::fs::read(&tmp).map_err(|e| format!("读临时文件失败: {}", e))?;
    let text = unsafe { String::from_utf8_unchecked(bytes) };
    std::fs::write(&state.db_path, state.crypto.encrypt(&text))
        .map_err(|e| format!("写加密文件失败: {}", e))?;
    std::fs::remove_file(&tmp).ok();
    Ok(())
}

#[tauri::command]
fn drag_window(window: tauri::Window) -> Result<(), String> {
    println!("[DEBUG] drag_window called");
    match window.start_dragging() {
        Ok(()) => {
            println!("[DEBUG] start_dragging OK");
            Ok(())
        }
        Err(e) => {
            println!("[DEBUG] start_dragging ERROR: {:?}", e);
            Err(format!("{}", e))
        }
    }
}

#[tauri::command]
fn bind_keychain(password: String) -> Result<bool, String> {
    if hash_password(&password) != hash_password("RZCY&ttpulin@2026") { return Ok(false); }
    let aes_key = derive_aes_key(&password);
    store_key_in_keychain(&aes_key)?;

    // 更新内存中的 crypto 和 db
    // 用真实密钥重新加密并保存现有数据库（如果有的话）
    // 注意：此时 AppState 中的 crypto 还是占位密钥，我们需要读取 state 并更新

    Ok(true)
}

/// 绑定后调用此命令完成初始化
#[tauri::command]
fn finalize_bind(s: State<AppState>) -> Result<(), String> {
    let key = read_key_from_keychain()?;
    // 重建数据库
    let db = create_memory_db()?;
    init_tables(&db)?;
    init_users(&db)?;
    seed_data(&db, &Crypto::from_key(key))?;
    // 写入标志文件
    let flag = s.db_path.with_extension("ready");
    std::fs::write(&flag, "1").map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn is_keychain_bound() -> Result<bool, String> { Ok(keychain_has_key()) }

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let dir = app.path().app_data_dir().expect("no app data dir");
            std::fs::create_dir_all(&dir).expect("create dir failed");
            let path = dir.join("ygcy.db.enc");
            if keychain_has_key() {
                let key = read_key_from_keychain()?;
                let crypto = Crypto::from_key(key);
                let db = load_or_create_db(&path, &crypto)?;
                app.manage(AppState { db: Mutex::new(db), crypto, db_path: path });
            } else {
                let db = create_memory_db()?;
                app.manage(AppState { db: Mutex::new(db), crypto: Crypto::from_key([0u8; 32]), db_path: path });
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                if let Some(s) = window.try_state::<AppState>() { let _ = save_db(&s); }
            }
        })
        .invoke_handler(tauri::generate_handler![
            drag_window,
            bind_keychain,
            finalize_bind,
            is_keychain_bound,
            login, register, change_password,
            list_environments, create_environment, update_environment, delete_environment,
            list_proxies, create_proxy, delete_proxy,
            start_browser, stop_browser,
            list_logs, add_log, clear_logs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn login(s: State<AppState>, username: String, password: String) -> Result<AuthResult, String> {
    let hash = hash_password(&password);
    let user = {
        let db = s.db.lock().map_err(|e| e.to_string())?;
        db.query_row(
            "SELECT id,username,role,created_at FROM users WHERE username=?1 AND password_hash=?2",
            params![&username, &hash],
            |r| Ok(User { id: r.get(0)?, username: r.get(1)?, role: r.get(2)?, created_at: r.get(3)? }),
        )
    };
    match user {
        Ok(u) => Ok(AuthResult { success: true, user: Some(u), error: None }),
        Err(_) => Ok(AuthResult { success: false, user: None, error: Some("账号或密码错误".to_string()) }),
    }
}

#[tauri::command]
fn register(s: State<AppState>, username: String, password: String) -> Result<AuthResult, String> {
    let exists = {
        let db = s.db.lock().map_err(|e| e.to_string())?;
        db.query_row("SELECT COUNT(*)>0 FROM users WHERE username=?1", params![&username], |r| r.get(0))
            .map_err(|e| e.to_string())
    }?;
    if exists { return Ok(AuthResult { success: false, user: None, error: Some("用户名已存在".to_string()) }); }
    let id = uuid::Uuid::new_v4().to_string();
    let t = now_str();
    {
        let db = s.db.lock().map_err(|e| e.to_string())?;
        db.execute("INSERT INTO users(id,username,password_hash,role,created_at) VALUES(?1,?2,?3,'user',?4)",
            params![&id, &username, &hash_password(&password), &t]).map_err(|e| e.to_string())?;
    }
    Ok(AuthResult { success: true, user: Some(User { id, username, role: "user".to_string(), created_at: t }), error: None })
}

#[tauri::command]
fn change_password(s: State<AppState>, username: String, old_password: String, new_password: String) -> Result<(), String> {
    let db = s.db.lock().map_err(|e| e.to_string())?;
    let old_hash = hash_password(&old_password);
    let new_hash = hash_password(&new_password);

    // 验证旧密码
    let count: i64 = db.query_row(
        "SELECT COUNT(*) FROM users WHERE username=?1 AND password_hash=?2",
        params![&username, &old_hash],
        |r| r.get(0),
    ).map_err(|e| e.to_string())?;

    if count == 0 {
        return Err("当前密码错误".to_string());
    }

    db.execute(
        "UPDATE users SET password_hash=?1 WHERE username=?2",
        params![&new_hash, &username],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

fn decrypt_env(c: &Crypto, id: &str, enc: &str) -> Result<BrowserEnv, String> {
    let j = c.decrypt(enc)?;
    let mut e: BrowserEnv = serde_json::from_str(&j).map_err(|e| format!("解析失败: {}", e))?;
    e.id = id.to_string(); Ok(e)
}

fn encrypt_env(c: &Crypto, e: &BrowserEnv) -> Result<String, String> {
    Ok(c.encrypt(&serde_json::to_string(e).map_err(|e| format!("序列化失败: {}", e))?))
}

#[tauri::command]
fn list_environments(s: State<AppState>) -> Result<Vec<BrowserEnv>, String> {
    let raw: Vec<(String, String)> = {
        let db = s.db.lock().map_err(|e| e.to_string())?;
        let mut st = db.prepare("SELECT id,data FROM browser_envs ORDER BY id DESC")
            .map_err(|e| e.to_string())?;
        let rows = st.query_map([], |r| Ok((r.get::<_,String>(0)?, r.get::<_,String>(1)?)))
            .map_err(|e| e.to_string())?;
        rows.filter_map(|r| r.ok()).collect()
    };
    Ok(raw.into_iter().filter_map(|(id,data)| decrypt_env(&s.crypto, &id, &data).ok()).collect())
}

#[tauri::command]
fn create_environment(s: State<AppState>, env: BrowserEnv) -> Result<BrowserEnv, String> {
    let id = format!("ENV-{}", &uuid::Uuid::new_v4().to_string()[..8].to_uppercase());
    let mut e = env; e.id = id.clone(); e.status = "stopped".to_string();
    e.created_at = now_str(); e.updated_at = now_str();
    let enc = encrypt_env(&s.crypto, &e)?;
    let db = s.db.lock().map_err(|e| e.to_string())?;
    db.execute("INSERT INTO browser_envs(id,data) VALUES(?1,?2)", params![&id, &enc])
        .map_err(|e| e.to_string())?;
    Ok(e)
}

#[tauri::command]
fn update_environment(s: State<AppState>, env: BrowserEnv) -> Result<(), String> {
    let mut e = env; e.updated_at = now_str();
    let enc = encrypt_env(&s.crypto, &e)?;
    let db = s.db.lock().map_err(|e| e.to_string())?;
    db.execute("UPDATE browser_envs SET data=?1 WHERE id=?2", params![&enc, &e.id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_environment(s: State<AppState>, id: String) -> Result<(), String> {
    let db = s.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM browser_envs WHERE id=?1", params![&id]).map_err(|e| e.to_string())?;
    Ok(())
}

fn decrypt_proxy(c: &Crypto, id: &str, enc: &str) -> Result<ProxyEntry, String> {
    let j = c.decrypt(enc)?;
    let mut p: ProxyEntry = serde_json::from_str(&j).map_err(|e| format!("解析失败: {}", e))?;
    p.id = id.to_string(); Ok(p)
}

fn encrypt_proxy(c: &Crypto, p: &ProxyEntry) -> Result<String, String> {
    Ok(c.encrypt(&serde_json::to_string(p).map_err(|e| format!("序列化失败: {}", e))?))
}

#[tauri::command]
fn list_proxies(s: State<AppState>) -> Result<Vec<ProxyEntry>, String> {
    let raw: Vec<(String, String)> = {
        let db = s.db.lock().map_err(|e| e.to_string())?;
        let mut st = db.prepare("SELECT id,data FROM proxies ORDER BY id")
            .map_err(|e| e.to_string())?;
        let rows = st.query_map([], |r| Ok((r.get::<_,String>(0)?, r.get::<_,String>(1)?)))
            .map_err(|e| e.to_string())?;
        rows.filter_map(|r| r.ok()).collect()
    };
    Ok(raw.into_iter().filter_map(|(id,data)| decrypt_proxy(&s.crypto, &id, &data).ok()).collect())
}

#[tauri::command]
fn create_proxy(s: State<AppState>, proxy: ProxyEntry) -> Result<ProxyEntry, String> {
    let id = uuid::Uuid::new_v4().to_string()[..8].to_string();
    let mut p = proxy; p.id = id.clone();
    let enc = encrypt_proxy(&s.crypto, &p)?;
    let db = s.db.lock().map_err(|e| e.to_string())?;
    db.execute("INSERT INTO proxies(id,data) VALUES(?1,?2)", params![&id, &enc])
        .map_err(|e| e.to_string())?;
    Ok(p)
}

#[tauri::command]
fn delete_proxy(s: State<AppState>, id: String) -> Result<(), String> {
    let db = s.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM proxies WHERE id=?1", params![&id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn start_browser(s: State<AppState>, env_id: String) -> Result<(), String> {
    let is_chrome = {
        let db = s.db.lock().map_err(|e| e.to_string())?;
        let data: String = db.query_row("SELECT data FROM browser_envs WHERE id=?1", params![&env_id], |r| r.get(0))
            .map_err(|_| "环境不存在".to_string())?;
        let mut env = decrypt_env(&s.crypto, &env_id, &data)?;
        let is_chrome = env.browser.starts_with("Chrome");
        env.status = "running".to_string();
        db.execute("UPDATE browser_envs SET data=?1 WHERE id=?2", params![&encrypt_env(&s.crypto, &env)?, &env_id])
            .map_err(|e| e.to_string())?;
        is_chrome
    };
    let cmd = if is_chrome { "google-chrome" } else { "msedge" };
    std::fs::create_dir_all("/tmp/ygcy-profiles").ok();
    std::process::Command::new(cmd).arg(format!("--user-data-dir=/tmp/ygcy-profiles/{}", env_id))
        .arg("--no-first-run").arg("--no-default-browser-check").arg("--disable-sync")
        .spawn().map_err(|e| format!("启动失败: {}", e))?;
    Ok(())
}

#[tauri::command]
fn stop_browser(s: State<AppState>, env_id: String) -> Result<(), String> {
    let db = s.db.lock().map_err(|e| e.to_string())?;
    let data: String = db.query_row("SELECT data FROM browser_envs WHERE id=?1", params![&env_id], |r| r.get(0))
        .map_err(|_| "环境不存在".to_string())?;
    let mut env = decrypt_env(&s.crypto, &env_id, &data)?;
    env.status = "stopped".to_string();
    db.execute("UPDATE browser_envs SET data=?1 WHERE id=?2", params![&encrypt_env(&s.crypto, &env)?, &env_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn list_logs(s: State<AppState>) -> Result<Vec<LogEntry>, String> {
    let raw: Vec<LogEntry> = {
        let db = s.db.lock().map_err(|e| e.to_string())?;
        let mut st = db.prepare("SELECT id,time,level,message FROM logs ORDER BY id DESC LIMIT 200")
            .map_err(|e| e.to_string())?;
        let rows = st.query_map([], |r| Ok(LogEntry { id: r.get(0)?, time: r.get(1)?, level: r.get(2)?, message: r.get(3)? }))
            .map_err(|e| e.to_string())?;
        rows.filter_map(|r| r.ok()).collect()
    };
    Ok(raw)
}

#[tauri::command]
fn add_log(s: State<AppState>, level: String, message: String) -> Result<(), String> {
    let db = s.db.lock().map_err(|e| e.to_string())?;
    db.execute("INSERT INTO logs(time,level,message) VALUES(?1,?2,?3)",
        params![&chrono::Local::now().format("%Y-%m-%d %H:%M:%S.%f").to_string(), &level, &message])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn clear_logs(s: State<AppState>) -> Result<(), String> {
    let db = s.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM logs", []).map_err(|e| e.to_string())?;
    Ok(())
}
