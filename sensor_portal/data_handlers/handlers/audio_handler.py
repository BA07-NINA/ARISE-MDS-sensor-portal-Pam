import io
import os
from datetime import datetime
from typing import Any, List, Tuple

import dateutil.parser
import pandas as pd
from data_handlers.functions import (get_image_recording_dt)
from data_handlers.handlers.default_image_handler import DataTypeHandler
from django.core.files import File

from django.db import models
from blog.models import Blog
from mutagen.mp3 import MP3
audio = MP3(os.path)


# #Handling audio files, extracting (meta)data from audio files, config-file and input from user, to send to frontend. 

# #Device_ID: last numbers of Device number is Device ID
# # ex.RIiD-10000000007ft35sm where 7ft35sm is the device ID 
# def get_device_ID():  
#     current_directory = os.getcwd() #get the current working directory
#     split_directory = current_directory.path.sep("\\")
#     full_device_name = split_directory[-1] #last part of path is device name
#     split_device_name = full_device_name.path.sep("0")
#     device_ID = split_device_name[-1] 
#     return device_ID

# #check if a device with this device ID already exists in the database
# def check_device_ID(device_ID):
#     for device in os.chdir(): #TODO insert url path for cloud
#         if device_ID in device:
#             trycatch:
#         else:
#             os.mkdir(device_ID) #if the device does not exist, create a new folder for the device

# # Deployment ID 
# # Structure: countryCode_deploymentNumber_DeviceID 
# # ex. NO_1_ 7ft35sm where 1 is the deployment number and 7ft35sm is the device ID
# def get_deployment_ID(): 
#     current_directory = os.getcwd()
#     parent_directory = os.path.dirname(current_directory)
#     split_parent_directory = parent_directory.split("\\")
#     full_name_deployment = split_parent_directory[-2]
#     split_deployment_name = full_name_deployment.split("0")
#     deployment_ID = split_deployment_name[-1]
#     return deployment_ID

# def get_file_date():
#     #date and time of file 
#     extract_filename = os.path.splitext(".") #splits on the last "."
#     file_extension = extract_filename[1]
#     data_type = file_extension
#     file_name = extract_filename[0] #ex. 2024-03-15T00_24_37.091Z
#     split_filename = file_name.split("-")
#     clean_day = split_filename[2] # 15T00_24_37.091Z
#     file_day = clean_day[:2] # selects the two first ciphers 
#     file_date = split_filename[:1] + file_day # selects indices until 1: 0 and 1, + fileday
#     try:
#         date_object = datetime.strptime(file_date).date()
#         print(f"The date object is: {date_object}")
#     except ValueError:
#         print("Invalid date format. Please use YYYY-MM-DD.")

# def get_file_size(audio):
#     return int(audio.info.length())

# def get_file_length(audio):
#     try:
#         length = audio.info.length
#         return str(length)
#     except:
#         return None
    
# # def get_last_recording_date():

# # def get_first_recording_date():

# # size of all files from one device
# def get_folder_size(device_ID):
#     folder_size = ""
#     folder_path = os.path.join(os.getcwd(), device_ID)
#     for root, dirs, files in os.walk(folder_path):  # root, dirs, files from os.walk
#         for filename in files:  # For each file in 'files' list
#             file_path = os.path.join(root, filename)  # Construct full file path
#             if os.path.isfile(file_path):  # Check if it's a file
#                 folder_size += os.path.getsize(file_path)  # Add file size to total size           
#     return str(folder_size)
    
# #samplerate of a file
# def get_samplerate(audio):
#     try:
#         samplerate = audio.info.sample_rate
#         return int(samplerate)
#     except:
#         return None

# #date/time of last uploaded file. Could also get name of file ex. 2024-03-15T00_24_37.091Z
# def get_last_uploaded_file_date(device_ID):
#     folder_path = os.path.join(os.getcwd(), device_ID) #current folder of chosen device
#     last_uploaded_file = None
#     last_uploaded_time = 0
#     for root, dirs, files in os.walk(folder_path):  
#         for filename in files: 
#             file_path = os.path.join(root, filename)  # full file path
#             if os.path.isfile(file_path): 
#                 file_time = os.path.getmtime(file_path)  # Get file modification time 
#                 if file_time > last_uploaded_time:  # Compare with last uploaded time which is set to 0
#                     last_uploaded_time = file_time # update last date of last uploaded file
#                     last_uploaded_file = filename  # Update the last uploaded file name
#     return str(last_uploaded_time)
    



# def get_post_download_task(self, file_extension: str, first_time: bool = True):
#     task = None
#     if file_extension.lower() in [".mp3"]:
#         task = "data_handler_generate_thumbnails"
#     return task



# def convert_daily_report(data_file) -> Tuple[Any | None, List[str] | None]:
#     # specific handler task
#     data_file_path = data_file.full_path()
#     # open txt file
#     with File(open(data_file_path, mode='rb'), os.path.split(data_file_path)[1]) as txt_file:
#         report_dict = parse_report_file(txt_file)

#         report_dict['Date'] = [dateutil.parser.parse(x, dayfirst=True)
#                                for x in report_dict['Date']]

#         report_dict = {k.lower(): v for k, v in report_dict.items()}

#         # convert to CSV file
#         report_df = pd.DataFrame.from_dict(report_dict)

#         # specific handling of columns
#         if 'battery' in report_df.columns:
#             # remove string from number
#             report_df['battery'] = report_df['battery'].apply(
#                 lambda x: x.replace("%", ""))

#         if 'temp' in report_df.columns:
#             # remove string from number
#             report_df['temp'] = report_df['temp'].apply(
#                 lambda x: x.replace(" Celsius Degree", ""))

#         if 'sd' in report_df.columns:
#             # split by /, remove the M, convert to number, divide.
#             def divide(num_1, num_2):
#                 return num_1/num_2

#             report_df['sd'] = report_df['sd'].apply(lambda x: divide(*[int(y.replace("M", ""))
#                                                                        for y in x.split("/")]))

#         # rename columns more informatively or to skip in plotting
#         report_df = report_df.rename(columns={"imei": "imei__",
#                                               "csq": "csq__",
#                                               "temp": "temp__temperature_degrees_celsius",
#                                               "battery": "battery__battery_%",
#                                               "sd": "sd__proportion_sd"})
        
#         # update file object
#         data_file.file_size = os.stat(data_file).st_size
#         data_file.modified_on = datetime.now()
#         data_file.file_format = ".mp3"

#         # remove original file
#         os.remove(data_file_path)

#         return data_file, [
#             "file_size", "modified_on", "file_format"]

#         # end specific handler task


# class audioHandler(DataTypeHandler):
#     data_types = ["audiomoth"]
#     device_models = [" "]
#     safe_formats = [".mp3"]
#     full_name = "Audio Handler"
#     description = """Data handler for audio moth"""
#     validity_description = """<ul>
#     <li>File format must be in available formats.</li>"""
#     handling_description = """<ul>
#     <li>Recording datetime is extracted from exif.</li>
#     <li><strong>Extra metadata attached:</strong>
#     <ul>
#     <li> YResolution, XResolutiom, Software: extracted from exif</li>
#     <li> 'daily_report': Added if the file is a daily report text file or image. Extracted from filename or format.
#     </ul>
#     </li>
#     </ul>"""
#     device_ID = get_device_ID(audio)
#     date = get_file_date(audio)
#     file_length = get_file_length(audio)
#     folder_size = get_folder_size(device_ID)
#     last_uploaded_file_date = get_last_uploaded_file_date(device_ID)
#     samplerate = get_samplerate(audio) 
       
