import sys
import os
import time

# --- PLATFORM DETECTION ---
IS_WINDOWS = os.name == 'nt'

if IS_WINDOWS:
    # Get the directory where the python executable is located
    base_dir = os.path.dirname(sys.executable)
    site_packages = os.path.join(base_dir, 'site-packages')
    if os.path.exists(site_packages):
        sys.path.append(site_packages)
    import pyvjoy
else:
    from evdev import UInput, ecodes as e, AbsInfo

def create_joystick(index):
    """Creates a single virtual joystick instance with 16 buttons"""
    if IS_WINDOWS:
        # vJoy devices must be enabled in vJoy Conf (Device 1, 2, 3...)
        return pyvjoy.VJoyDevice(index + 1)
    else:
        # 8 Analog Axes
        axis_map = [
            e.ABS_X, e.ABS_Y, e.ABS_Z, 
            e.ABS_RX, e.ABS_RY, e.ABS_RZ, 
            e.ABS_THROTTLE, e.ABS_RUDDER
        ]
        
        # 16 Buttons (BTN_JOYSTICK range: 0x100 to 0x10F)
        # This is the most compatible range for older games and Linux drivers.
        button_map = [code for code in range(0x100, 0x110)]
        
        cap = {
            e.EV_ABS: [(ax, AbsInfo(value=128, min=0, max=255, fuzz=0, flat=0, resolution=0)) for ax in axis_map],
            e.EV_KEY: button_map
        }
        
        name = f'OmniPanel-Virtual-Controller-{index + 1}'
        # bus=e.BUS_USB helps games identify it as a plug-and-play controller
        ui = UInput(cap, name=name)
        
        # Center all axes on startup
        for ax in axis_map:
            ui.write(e.EV_ABS, ax, 128)
        ui.syn()
        
        return {"ui": ui, "axes": axis_map, "buttons": button_map}

def main():
    # 1. Get joystick count from command line argument (passed by Node.js)
    # sys.argv[0] is the script name, sys.argv[1] is the first argument
    try:
        num_joysticks = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    except (ValueError, IndexError):
        num_joysticks = 1
        
    # 2. Initialize the devices
    joysticks = [create_joystick(i) for i in range(num_joysticks)]
    
    print(f"Python backend active: Created {num_joysticks} joysticks (16 buttons each).", flush=True)

    # 3. Listen for commands from Node.js stdin
    for line in sys.stdin:
        try:
            parts = line.strip().split(',')
            if len(parts) != 4: continue
            
            js_idx, cmd_type, target_id, val = int(parts[0]), parts[1], int(parts[2]), int(parts[3])
            
            # Safety check: Ignore commands for joysticks that don't exist
            if js_idx >= len(joysticks): continue
            js = joysticks[js_idx]

            if cmd_type == 'ax':
                if IS_WINDOWS:
                    # vJoy uses 0-32768
                    vjoy_val = int((val / 255) * 32768)
                    usages = [0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37]
                    if target_id < len(usages):
                        js.set_axis(usages[target_id], vjoy_val)
                else:
                    ui = js["ui"]
                    ui.write(e.EV_ABS, js["axes"][target_id], val)
                    ui.syn()

            elif cmd_type == 'btn':
                if IS_WINDOWS:
                    # Buttons are 1-indexed in pyvjoy
                    js.set_button(target_id + 1, 1 if val == 1 else 0)
                else:
                    ui = js["ui"]
                    # Map the 0-15 ID to the specific hex code in our button_map
                    if target_id < len(js["buttons"]):
                        ui.write(e.EV_KEY, js["buttons"][target_id], 1 if val == 1 else 0)
                        ui.syn()

        except Exception as err:
            # Prevent the script from crashing on bad data
            print(f"Error processing command: {err}", file=sys.stderr, flush=True)

if __name__ == "__main__":
    main()