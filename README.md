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
* [Using the Editor](#-using-the-editor)
* [Creating Custom Blocks](#-creating-custom-blocks)
* [Installation Guide](#-installation-guide)
    * [Windows Setup](#-windows-setup)
    * [Linux Setup](#-linux-setup)
* [Roadmap](#️-roadmap)
* [Contributing](#-contributing)

---

## ✨ Key Features
* **Local Hosting:** Host your own designs directly on your network.
* **Fast Input Detection:** Instant communication between touch events and virtual joysticks.
* **Extreme Customization:** Use HTML/CSS to build your dream cockpit.
* **Privacy Focused:** No accounts, no cloud, no data tracking.

---

## 🎨 Using the Editor
The OmniPanel editor is a live, "What You See Is What You Get" workspace. It allows you to build and preview your cockpit layout in real-time.

* **Layout Management:** Drag the move handle (**☩**) to reposition blocks. Use the bottom-right resize handle to scale elements to fit your screen.
* **Block Configuration:** Click the gear icon (**⚙**) on any block to open its specific settings. Here you can map virtual joystick buttons, adjust colors, or change labels.
* **Duplication:** Once created a block of your liking use the duplication icon (**⧉**) in the block hierarchy to make a copy of the original, allowing faster theme creation.

---

## 🧱 Creating Custom Blocks
OmniPanel is designed to be modular. If you can write basic HTML and CSS, you can build a custom block that the app will recognize immediately.

### 1. File Location
The app automatically scans the following directory on startup and adds any valid `.html` files to your library:
`user/blocks/`

### 2. Anatomy of a Block
To create a new block, place an `.html` file (e.g., `toggle_switch.html`) in that folder. A standard block consists of your visual HTML/CSS and a special `<settings>` tag that tells the editor which options to show. 

```html
<settings 
  joystick="0" type-joystick="number" min-joystick="0" max-joystick="9"
  button="0" type-button="number" min-button="0" max-button="15"
  my_label="default text" type-my_label="text" 
  some_number="6" type-some_number="number" min-some_number="0" max-some_number="10"
  nice_color="#00ff00ff" type-nice_color="color"
></settings>

<div class="my-custom-button" style="--border: settings-some_number ; --color: settings-nice_color ;">
  <button virtual-joystick="settings-joystick" emulate-button="settings-button">
    settings-my_label
  </button>
</div>

<style>
    /* Your block-specific CSS here */
    .my-custom-button {
        background: var(--color);
        border: var(--border) solid white;
    }
</style>
```

### 3. Auto-Detection
You don't need to touch any configuration files. Simply:
1.  Drop your `.html` file into the `user/blocks/` folder.
2.  Restart or refresh the OmniPanel host app.
3.  Your new block will appear in the library, ready to be dragged onto your workspace.

---

## 🔧 Installation Guide

### 🪟 Windows Setup
Windows requires the vJoy driver to create virtual joysticks that games can recognize.

1.  **Install vJoy:** Download from the [vJoy GitHub Repository](https://github.com/jshafer81/vJoy).
2.  **Configure vJoy:** * Open the **Configure vJoy** app.
    * Enable **4 virtual joysticks** (this is plenty for most complex setups).
    * Ensure each device has 16 buttons at least.
    * Click **Apply**.
3.  **Done.**

### 🐧 Linux Setup
Linux uses the native `uinput` kernel module for high-performance virtual input.

1.  **Enable uinput Module:**
    ```bash
    sudo modprobe uinput
    ```
2.  **Set Permissions:**
    ```bash
    echo 'KERNEL=="uinput", MODE="0660", GROUP="uinput", OPTIONS+="static_node=uinput"' | sudo tee /etc/udev/rules.d/99-uinput.rules
    sudo groupadd -f uinput
    sudo usermod -aG uinput $USER
    ```
    *(Note: You must log out and back in for group changes to take effect).*
3.  **Enable on Startup:**
    ```bash
    echo "uinput" | sudo tee /etc/modules-load.d/uinput.conf
    ```
5.  **Done.**

---

## 🗺️ Roadmap
* **Multi-Instance Support:** Host different themes for different devices simultaneously.
* **Slider Sync:** Real-time state syncing across multiple clients.
* **Dedicated Client App:** Reducing browser "jank" with a native wrapper.
* **Plugins:** Plugins for specific games, like api support etc.

---

## 🤝 Contributing
Contributions make the open-source community amazing. 
1.  Fork the Project.
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the Branch (`git push origin feature/AmazingFeature`).
5.  Open a **clear Pull Request** so I can easily understand your changes.

**Thank you for trying OmniPanel!**