<h1>✨ OmniPanel</h1>

<p align="center">
    <strong>OmniPanel is a cross-device remote control system designed to simplify complex game and application controls. Turn your smartphone, tablet, or secondary monitor into a dedicated, touch-optimized input panel.</strong>
</p>

<p>No more memorizing dozens of keybinds—just intuitive graphical buttons in the palm of your hand.</p>



<hr>

<h2>💡 The Core Concept: Remote Input</h2>
<p>OmniPanel bridges the gap between your mobile devices and your PC without interrupting your workflow.</p>

<ul>
    <li><strong>Host on PC:</strong> Run the OmniPanel host application on your computer.</li>
    <li><strong>Connect via Phone/Tablet:</strong> Simply visit your PC's local IP address on any device's browser.</li>
    <li><strong>Zero-Focus Stealing:</strong> Buttons pressed on your phone simulate keystrokes on your PC instantly, allowing you to <strong>keep playing normally</strong> without the game window losing focus.</li>
    <li><strong>Network-Ready:</strong> Securely allows incoming connections from your local Wi-Fi while blocking external traffic via integrated security filtering.</li>
</ul>

<hr>

<h2>⬇️ Installation & Setup</h2>
<ol>
    <li><strong>Download</strong> the latest installer for your OS from the <a href="LINK_TO_RELEASES">Releases Page</a>.</li>
    <li><strong>Launch the App:</strong> Run OmniPanel. A window will appear showing your <strong>Local IP Address</strong> (e.g., <code>http://192.168.0.15:3000</code>).</li>
    <li><strong>Connect your Device:</strong> On your phone or tablet, open a browser and type in that IP address.</li>
    <li><strong>Firewall Setup (Linux/KDE):</strong> Ensure your firewall allows incoming traffic on your chosen port for your local subnet (e.g., <code>192.168.0.0/24</code>).</li>
</ol>

<hr>

<h2>🎨 Customization & Theming</h2>
<p>OmniPanel is built for complete creative freedom. You can build your own controllers using standard web technologies.</p>

<ul>
    <li><strong>Dynamic Theming:</strong> All visual assets live in the <code>user/</code> directory. Swap themes by simply changing the configuration in <code>config.json</code>.</li>
    <li><strong>JS-Free Themes:</strong> For security, themes consist <em>strictly</em> of HTML and CSS. OmniPanel automatically injects the necessary WebSocket logic to handle communication.</li>
    <li><strong>Custom Keybinds:</strong> Use the <code>emulate-key</code> attribute in your HTML to map any button to a PC keystroke:</li>
</ul>

<pre><code>&lt;button emulate-key="F5"&gt;Quick Save&lt;/button&gt;</code></pre>

<hr>

<h2>🔒 Security</h2>
<p>Your PC's safety is a priority. OmniPanel includes a built-in <strong>Security Filter</strong> that scans every theme before it is served to your devices.</p>
<ul>
    <li>Blocks unauthorized <code>&lt;script&gt;</code> tags and iframes.</li>
    <li>Prevents external CSS injections and malicious event handlers (<code>onclick</code>, etc.).</li>
    <li>Restricts traffic to your local network only.</li>
</ul>

<hr>

<h2>⚠️ Disclaimer (Development Status)</h2>
<blockquote style="border-left: 4px solid #f90; padding-left: 15px; margin: 1em 0;">
    <p>OmniPanel is under <strong>active development</strong>. New updates may introduce breaking changes to theme structures. Always check the <strong>Changelog</strong> before updating.</p>
</blockquote>

<hr>

<h2>🤝 Contributing</h2>
<p>We welcome contributions! Whether you're a developer or a theme designer, check out our <a href="LINK_TO_CONTRIBUTING_GUIDELINES">Contributing Guidelines</a> to get started.</p>