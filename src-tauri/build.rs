fn main() {
    println!("cargo:rustc-link-search=native=/home/apt/.local/usr/lib/x86_64-linux-gnu");
    println!("cargo:rustc-link-arg=-Wl,-rpath,/home/apt/.local/usr/lib/x86_64-linux-gnu");
    tauri_build::build()
}
