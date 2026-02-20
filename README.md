<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OmniPanel README</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            background-color: #f6f8fa;
        }
        .container {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { border-bottom: 2px solid #eaecef; padding-bottom: 0.3em; }
        h2 { border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; margin-top: 1.5em; }
        code {
            background-color: rgba(27,31,35,0.05);
            padding: 0.2em 0.4em;
            border-radius: 3px;
            font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
        }
        pre {
            background-color: #f6f8fa;
            padding: 1rem;
            border-radius: 6px;
            overflow: auto;
        }
        pre code { background: none; padding: 0; }
        nav {
            background: #eef1f4;
            padding: 1rem;
            border-radius: 6px;
            margin-bottom: 2rem;
        }
        nav ul { list-style: none; padding: 0; }
        nav li { margin: 0.5rem 0; }
        a { color: #0366d6; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .feature-list { list-style-type: square; }
        .note {
            background: #fffbdd;
            border-left: 5px solid #d4a017;
            padding: 1rem;
            margin: 1rem 0;
        }
    </style>
</head>
<body>

<div class="container">
    <h1>🚀 OmniPanel</h1>
    <p><strong>OmniPanel</strong> is a lightweight, open-source application designed to bridge the gap between your PC and any touch device on your local network. Create custom Multi-Function Displays (MFDs) for any game—turning tablets, phones, or old laptops into dedicated cockpit hardware.</p>

    <nav>
        <strong>Contents</strong>
        <ul>
            <li><a href="#key-features">Key Features</a></li>
            <li><a href="#installation">Installation Guide</a></li>
            <li><a href="#creating-a-theme">Creating a Theme</a></li>
            <li><a href="#roadmap">Roadmap</a></li>
            <li><a href="#contributing">Contributing</a></li>
        </ul>
    </nav>

    <h2 id="key-features">✨ Key Features</h2>
    <ul class="feature-list">
        <li><strong>Local Hosting:</strong> Host your own designs directly on your network.</li>
        <li><strong>Fast Input Detection:</strong> Instant communication between touch events and virtual joysticks.</li>
        <li><strong>Extreme Customization:</strong> Use HTML/CSS to build your dream cockpit.</li>
        <li><strong>Privacy Focused:</strong> No accounts, no cloud, no data tracking.</li>
    </ul>

    <h2 id="installation">🔧 Installation Guide</h2>

    <h3>🪟 Windows Setup</h3>
    <ol>
        <li><strong>Install vJoy:</strong> Download from the <a href="https://github.com/jshafer81/vJoy" target="_blank">vJoy GitHub Repository</a>.</li>
        <li><strong>Configure vJoy:</strong> Open <em>Configure vJoy</em>, enable 4 devices with at least 32 buttons each, and click Apply.</li>
    </ol>

    <h3>🐧 Linux Setup</h3>
    <ol>
        <li><strong>Install Dependencies:</strong>
            <pre><code># Arch: sudo pacman -S python python-pip
# Ubuntu: sudo apt install python3 python3-pip</code></pre>
        </li>
        <li><strong>Enable Module:</strong> <code>sudo modprobe uinput</code></li>
        <li><strong>Set Permissions:</strong>
            <pre><code>echo 'KERNEL=="uinput", MODE="0660", GROUP="uinput", OPTIONS+="static_node=uinput"' | sudo tee /etc/udev/rules.d/99-uinput.rules
sudo groupadd -f uinput
sudo usermod -aG uinput $USER</code></pre>
        </li>
        <li><strong>Enable on Startup:</strong>
            <pre><code>echo "uinput" | sudo tee /etc/modules-load.d/uinput.conf</code></pre>
        </li>
    </ol>
    <p class="note"><strong>Note:</strong> Log out and back in for group changes to take effect. For help, see the <a href="https://wiki.archlinux.org/title/Uinput" target="_blank">Arch Wiki uinput guide</a>.</p>

    <h2 id="creating-a-theme">🎨 Creating a Theme</h2>
    <p>OmniPanel themes use standard web technologies. To keep the app secure, <strong>JavaScript is not allowed</strong> inside theme folders.</p>
    <ul>
        <li>Navigate to <code>omnipanel/user/[theme-name]/html</code>.</li>
        <li>Add an <code>index.html</code> and your CSS.</li>
        <li>Refer to the default theme as a template.</li>
    </ul>

    <h2 id="roadmap">🗺️ Roadmap</h2>
    <ul>
        <li><strong>Drag-and-Drop Editor:</strong> Visual MFD building.</li>
        <li><strong>Modular Blocks:</strong> Community-made HTML/CSS components.</li>
        <li><strong>Multi-Instance Support:</strong> Different themes for different devices at once.</li>
        <li><strong>Slider Sync:</strong> Real-time state syncing across clients.</li>
        <li><strong>Dedicated Client App:</strong> To reduce browser-related latency.</li>
    </ul>

    <h2 id="contributing">🤝 Contributing</h2>
    <p>Please fork the project and submit clear <strong>Pull Requests</strong> for any features or bug fixes. Thank you for trying OmniPanel!</p>
</div>

</body>
</html>