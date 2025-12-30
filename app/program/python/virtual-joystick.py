import sys
import os
import time

# --- PLATFORM DETECTION ---
IS_WINDOWS = os.name == 'nt'

def setup_device():
    if IS_WINDOWS:
        import vgamepad as vg
        print("Initializing Windows ViGEmBus Device...", flush=True)
        return vg.VX360Gamepad()
    else:
        from evdev import UInput, ecodes as e, AbsInfo
        print("Initializing Linux uinput Device...", flush=True)
        
        axis_map = [
            e.ABS_X, e.ABS_Y, e.ABS_Z, 
            e.ABS_RX, e.ABS_RY, e.ABS_RZ, 
            e.ABS_THROTTLE, e.ABS_RUDDER
        ]
        
        # ADD THIS: Define a dummy button (BTN_JOYSTICK)
        cap = {
            e.EV_ABS: [
                (ax, AbsInfo(value=128, min=0, max=255, fuzz=0, flat=0, resolution=0)) 
                for ax in axis_map
            ],
            e.EV_KEY: [e.BTN_JOYSTICK, e.BTN_0] # This "tricks" Linux into seeing a Joystick
        }
        
        ui = UInput(cap, name='OmniPanel-Virtual-Controller')
        
        # Send a neutral signal
        for ax in axis_map:
            ui.write(e.EV_ABS, ax, 128)
        ui.syn()
        
        print("Linux Device Registered Successfully", flush=True)
        return ui, axis_map

def main():
    try:
        device_info = setup_device()
    except Exception as e:
        print(f"FAILED TO CREATE DEVICE: {e}", flush=True)
        sys.exit(1)
    
    if IS_WINDOWS:
        gamepad = device_info
    else:
        ui, axis_map = device_info

    print("Joystick Ready. Waiting for input...", flush=True)

    try:
        for line in sys.stdin:
            line = line.strip()
            if not line: continue
                
            try:
                axis_id, val = map(int, line.split(','))
                
                if IS_WINDOWS:
                    if axis_id == 0: gamepad.left_joystick_float(x_value_float=val/255, y_value_float=0)
                    elif axis_id == 1: gamepad.left_joystick_float(x_value_float=0, y_value_float=val/255)
                    elif axis_id == 4: gamepad.left_trigger(value=val)
                    elif axis_id == 5: gamepad.right_trigger(value=val)
                    gamepad.update()
                else:
                    from evdev import ecodes as e
                    ui.write(e.EV_ABS, axis_map[axis_id], val)
                    ui.syn()
                    # Optional: print for debug so Node.js can see the value received
                    print(f"Axis {axis_id} updated to {val}", flush=True)
                    
            except (ValueError, IndexError) as err:
                print(f"Data Error: {err}", flush=True)
                
    except KeyboardInterrupt:
        print("Shutting down joystick...", flush=True)

if __name__ == "__main__":
    main()