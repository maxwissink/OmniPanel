import sys
import os
import time

# --- PLATFORM DETECTION ---
IS_WINDOWS = os.name == 'nt'

if IS_WINDOWS:
    try:
        import pyvjoy
    except ImportError:
        print("Error: pyvjoy not found. Run 'pip install pyvjoy'", flush=True)
        sys.exit(1)
else:
    from evdev import UInput, ecodes as e, AbsInfo

def setup_device():
    if IS_WINDOWS:
        print("Initializing Windows (vJoy Device 1)...", flush=True)
        # Initialize vJoy Device #1
        j = pyvjoy.VJoyDevice(1)
        
        # vJoy Axis Mapping (HID Usages)
        # 0:X, 1:Y, 2:Z, 3:RX, 4:RY, 5:RZ, 6:SL0, 7:SL1
        win_axis_map = [
            pyvjoy.HID_USAGE_X,   # 0
            pyvjoy.HID_USAGE_Y,   # 1
            pyvjoy.HID_USAGE_Z,   # 2
            pyvjoy.HID_USAGE_RX,  # 3
            pyvjoy.HID_USAGE_RY,  # 4
            pyvjoy.HID_USAGE_RZ,  # 5
            pyvjoy.HID_USAGE_SL0, # 6
            pyvjoy.HID_USAGE_SL1  # 7
        ]
        return j, win_axis_map
    else:
        print("Initializing Linux (uinput Generic Joystick)...", flush=True)
        axis_map = [e.ABS_X, e.ABS_Y, e.ABS_Z, e.ABS_RX, e.ABS_RY, e.ABS_RZ, e.ABS_THROTTLE, e.ABS_RUDDER]
        button_map = [code for code in range(0x100, 0x120)] # 32 buttons (BTN_0 to BTN_31)
        
        cap = {
            e.EV_ABS: [(ax, AbsInfo(value=128, min=0, max=255, fuzz=0, flat=0, resolution=0)) for ax in axis_map],
            e.EV_KEY: button_map
        }
        ui = UInput(cap, name='OmniPanel-Virtual-Controller')
        for ax in axis_map: ui.write(e.EV_ABS, ax, 128)
        ui.syn()
        return ui, axis_map, button_map

def main():
    device_data = setup_device()
    
    if IS_WINDOWS:
        j, win_axis_map = device_data
    else:
        ui, axis_map, button_map = device_data

    print("Joystick Ready (vJoy). Monitoring Stdin...", flush=True)

    for line in sys.stdin:
        try:
            parts = line.strip().split(',')
            if len(parts) != 3: continue
            
            cmd_type, target_id, val = parts[0], int(parts[1]), int(parts[2])

            if cmd_type == 'ax':
                if IS_WINDOWS:
                    # vJoy axes expect 0x0000 to 0x8000 (0 to 32768)
                    # Convert your 0-255 input to vJoy range
                    vjoy_val = int((val / 255) * 32768)
                    if target_id < len(win_axis_map):
                        j.set_axis(win_axis_map[target_id], vjoy_val)
                else:
                    ui.write(e.EV_ABS, axis_map[target_id], val)
                    ui.syn()

            elif cmd_type == 'btn':
                if IS_WINDOWS:
                    # Explicitly ensure we are sending integers
                    button_id = int(target_id) + 1
                    button_state = 1 if int(val) == 1 else 0
                    
                    # Print for debugging so you can see it in the console
                    print(f"vJoy: Pressing Button {button_id} with state {button_state}", flush=True)
                    
                    # Some versions of vJoy prefer this method if set_button fails
                    j.set_button(button_id, button_state)
                else:
                    if target_id < len(button_map):
                        ui.write(e.EV_KEY, button_map[target_id], val)
                        ui.syn()

        except Exception as err:
            print(f"Loop Error: {err}", flush=True)

if __name__ == "__main__":
    main()