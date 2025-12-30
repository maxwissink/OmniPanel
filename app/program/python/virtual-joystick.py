import sys
import os
import time

# --- PLATFORM DETECTION ---
IS_WINDOWS = os.name == 'nt'

if IS_WINDOWS:
    import vgamepad as vg
else:
    # On Linux, we need these globally available for the main loop
    from evdev import UInput, ecodes as e, AbsInfo

def setup_device():
    if IS_WINDOWS:
        print("Initializing Windows (Xbox 360 Emulation)...", flush=True)
        gamepad = vg.VX360Gamepad()
        
        # Windows Button Mapping (0-14)
        win_btn_map = [
            vg.XUSB_BUTTON.XUSB_GAMEPAD_A,               # 0
            vg.XUSB_BUTTON.XUSB_GAMEPAD_B,               # 1
            vg.XUSB_BUTTON.XUSB_GAMEPAD_X,               # 2
            vg.XUSB_BUTTON.XUSB_GAMEPAD_Y,               # 3
            vg.XUSB_BUTTON.XUSB_GAMEPAD_LEFT_SHOULDER,    # 4
            vg.XUSB_BUTTON.XUSB_GAMEPAD_RIGHT_SHOULDER,   # 5
            vg.XUSB_BUTTON.XUSB_GAMEPAD_BACK,            # 6
            vg.XUSB_BUTTON.XUSB_GAMEPAD_START,           # 7
            vg.XUSB_BUTTON.XUSB_GAMEPAD_LEFT_THUMB,      # 8
            vg.XUSB_BUTTON.XUSB_GAMEPAD_RIGHT_THUMB,     # 9
            vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_UP,         # 10
            vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_DOWN,       # 11
            vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_LEFT,       # 12
            vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_RIGHT,      # 13
            vg.XUSB_BUTTON.XUSB_GAMEPAD_GUIDE            # 14
        ]
        return gamepad, win_btn_map
    else:
        print("Initializing Linux (uinput Generic Joystick)...", flush=True)
        
        # 8 Axes for Linux
        axis_map = [e.ABS_X, e.ABS_Y, e.ABS_Z, e.ABS_RX, e.ABS_RY, e.ABS_RZ, e.ABS_THROTTLE, e.ABS_RUDDER]
        
        # 16 Buttons for Linux (BTN_0 to BTN_15)
        button_map = [code for code in range(0x100, 0x110)] 
        
        cap = {
            e.EV_ABS: [(ax, AbsInfo(value=128, min=0, max=255, fuzz=0, flat=0, resolution=0)) for ax in axis_map],
            e.EV_KEY: button_map
        }
        
        ui = UInput(cap, name='OmniPanel-Virtual-Controller')
        
        # Neutralize axes immediately
        for ax in axis_map:
            ui.write(e.EV_ABS, ax, 128)
        ui.syn()
        
        return ui, axis_map, button_map

def main():
    device_data = setup_device()
    
    if IS_WINDOWS:
        gamepad, win_btn_map = device_data
    else:
        ui, axis_map, button_map = device_data

    print("Joystick Ready. Monitoring Stdin...", flush=True)

    for line in sys.stdin:
        try:
            parts = line.strip().split(',')
            if len(parts) != 3: continue
            
            cmd_type, target_id, val = parts[0], int(parts[1]), int(parts[2])

            if cmd_type == 'ax':
                if IS_WINDOWS:
                    # Windows Axes: 0=LX, 1=LY, 2=RX, 3=RY, 4=LT, 5=RT
                    if target_id == 0: gamepad.left_joystick_float(x_value_float=val/255, y_value_float=0)
                    elif target_id == 1: gamepad.left_joystick_float(x_value_float=0, y_value_float=val/255)
                    elif target_id == 4: gamepad.left_trigger(value=val)
                    elif target_id == 5: gamepad.right_trigger(value=val)
                    gamepad.update()
                else:
                    # 'e' is now available globally
                    ui.write(e.EV_ABS, axis_map[target_id], val)
                    ui.syn()

            elif cmd_type == 'btn':
                if IS_WINDOWS:
                    if target_id < len(win_btn_map):
                        if val == 1: gamepad.press_button(button=win_btn_map[target_id])
                        else: gamepad.release_button(button=win_btn_map[target_id])
                        gamepad.update()
                else:
                    if target_id < len(button_map):
                        ui.write(e.EV_KEY, button_map[target_id], val)
                        ui.syn()

        except Exception as err:
            print(f"Loop Error: {err}", flush=True)

if __name__ == "__main__":
    main()