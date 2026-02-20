# 🚀 OmniPanel

**OmniPanel** is a lightweight, open-source application designed to bridge the gap between your PC and any touch device on your local network. Create custom Multi-Function Displays (MFDs) for any game—turning tablets, phones, or old laptops into dedicated cockpit hardware.

### Why OmniPanel?
Many existing solutions are proprietary, require accounts, or are too bloated. OmniPanel was built to be:
* **Simple & Lightweight:** No account required. No cloud dependencies.
* **Performance First:** Optimized for instant input detection to ensure zero lag.
* **Open & Flexible:** Designed for the community to build, share, and maintain their own designs.

---

## 📑 Table of Contents
* [Key Features](#-key-features)
* [Installation Guide](#-installation-guide)
    * [Windows Setup](#-windows-setup)
    * [Linux Setup](#-linux-setup)
* [Creating a Theme](#-creating-a-theme)
* [Roadmap](#-roadmap)
* [Contributing](#-contributing)

---

## ✨ Key Features
* **Local Hosting:** Host your own designs directly on your network.
* **Fast Input Detection:** Instant communication between touch events and virtual joysticks.
* **Extreme Customization:** Use HTML/CSS to build your dream cockpit.
* **Privacy Focused:** No accounts, no cloud, no data tracking.

---

## 🔧 Installation Guide

### 🪟 Windows Setup
Windows requires the vJoy driver to create virtual joysticks that games can recognize.

1.  **Install vJoy:** Download from the [vJoy GitHub Repository](https://github.com/jshafer81/vJoy).
2.  **Configure vJoy:** * Open the **Configure vJoy** app.
    * Enable **4 virtual joysticks** (this is plenty for most complex setups).
    * Ensure each device has enough buttons (e.g., 32 or 64).
    * Click **Apply**.
3.  **Done.**

### 🐧 Linux Setup
Linux uses the native `uinput` kernel module for high-performance virtual input.

1.  **Install Dependencies:**
    ```bash
    # Arch Linux
    sudo pacman -S python python-pip
    
    # Ubuntu/Debian
    sudo apt install python3 python3-pip
    ```
2.  **Enable uinput Module:**
    ```bash
    sudo modprobe uinput
    ```
3.  **Set Permissions:**
    ```bash
    echo 'KERNEL=="uinput", MODE="0660", GROUP="uinput", OPTIONS+="static_node=uinput"' | sudo tee /etc/udev/rules.d/99-uinput.rules
    sudo groupadd -f uinput
    sudo usermod -aG uinput $USER
    ```
    *(Note: You must log out and back in for group changes to take effect).*
4.  **Enable on Startup:**
    ```bash
    echo "uinput" | sudo tee /etc/modules-load.d/uinput.conf
    ```
5.  **Done.**

---

## 🎨 Creating a Theme
OmniPanel themes use standard web technologies. To keep the app secure and lightweight, **JavaScript is not allowed and will be blocked** inside theme folders—all logic is handled by the OmniPanel core.

1.  Navigate to `omnipanel/user/[your-theme-name]/html`.
2.  Add an `index.html` and your CSS files.
3.  Refer to the **Default Theme** provided in the repository as a template.

Also please be carefull when downloading someone elses theme, I cannot guarantee that I filtered out all possibly mallicious tags

---

## 🗺️ Roadmap
* **Drag-and-Drop Editor:** Build MFDs visually without touching code.
* **Modular Blocks:** Advanced users can still code custom HTML/CSS "blocks" to be used in the visual editor.
* **Multi-Instance Support:** Host different themes for different devices simultaneously.
* **Slider Sync:** Real-time state syncing across multiple clients.
* **Dedicated Client App:** Reducing browser "jank" with a native wrapper.

---

## 🤝 Contributing
Contributions make the open-source community amazing. 
1.  Fork the Project.
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the Branch (`git push origin feature/AmazingFeature`).
5.  Open a **clear Pull Request** so I can easily understand your changes.

**Thank you for trying OmniPanel!**