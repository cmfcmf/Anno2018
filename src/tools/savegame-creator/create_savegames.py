import argparse
import time
import pyautogui
from shutil import copyfile
from os import path
from datetime import datetime

parser = argparse.ArgumentParser(description="Automatically save an Anno 1602 game every N seconds. All savegames are copied to the output_path provided. Warning: The 10th savegame slot will be overwritten! To use this, start Anno 1602 in a window (i.e., using D3Windower) and place the mouse at the very center of the options button.")

parser.add_argument("anno_save_folder")
parser.add_argument("interval", type=int)
parser.add_argument("output_path")

args = parser.parse_args()

anno_save_folder = args.anno_save_folder
output_path = args.output_path
interval = args.interval

print(f"Saving to {output_path} every {interval} seconds.")

scale = 2

time.sleep(5)

starttime=time.time()
i = 0
while True:
  pyautogui.click()
  pyautogui.moveRel(-160 * scale, 425 * scale)
  time.sleep(0.01)
  pyautogui.click()
  pyautogui.moveRel(0 * scale, -45 * scale)
  time.sleep(0.01)
  pyautogui.click()
  pyautogui.moveRel(0 * scale, 45 * scale)
  time.sleep(0.01)
  pyautogui.click()
  pyautogui.moveRel(160 * scale, -425 * scale)

  copyfile(path.join(anno_save_folder, "game11.gam"), path.join(output_path, f"save_{i}.gam"))

  time.sleep(interval - ((time.time() - starttime) % interval))
  i += 1
