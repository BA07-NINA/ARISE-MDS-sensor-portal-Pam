import io
import os
from datetime import datetime
from typing import Any, List, Tuple

import dateutil.parser
import pandas as pd
from data_handlers.functions import (get_image_recording_dt)
from data_handlers.handlers.default_image_handler import DataTypeHandler
from django.core.files import File

from mutagen.mp3 import MP3
file = MP3("example.mp3")
print(file.info.length)
print(file.info.bitrate)

#handling audio files, extracting (meta)data from the file(s) and config-file to send to frontend. 

class audioHandler(DataTypeHandler):
    data_types = ["audiomoth"]
    device_models = [" "]
    safe_formats = [".mp3"]
    full_name = "Audio Handler"
    description = """Data handler for audio moth"""
    validity_description = """<ul>
    <li>File format must be in available formats.</li>"""
    handling_description = """<ul>
    <li>Recording datetime is extracted from exif.</li>
    <li><strong>Extra metadata attached:</strong>
    <ul>
    <li> YResolution, XResolutiom, Software: extracted from exif</li>
    <li> 'daily_report': Added if the file is a daily report text file or image. Extracted from filename or format.
    </ul>
    </li>
    </ul>"""

   
def handle_file(self, file): #TODO: add arguments
    #device_ID
    current_directory = os.getcwd()
    parent_directory = os.path.dirname(current_directory)
    split_parent_directory = parent_directory.split("\\")
    full_name_device = split_parent_directory[-1]
    split_device_name = full_name_device.split("0")
    device_ID = split_device_name[-1]
    

    
   
    



    return file_size, device_ID, data_type,

def get_date(string):
    #date and time of file 
    extract_filename = os.path.splitext(".") #splits on the last "."
    file_extension = extract_filename[1]
    data_type = file_extension
    file_name = extract_filename[0] #ex. 2024-03-15T00_24_37.091Z
    split_filename = file_name.split("-")
    clean_day = split_filename[2]
    file_day = clean_day[:2]
    file_date = split_filename[:1] + file_date
    try:
        date_object = datetime.strptime(file_date).date()
        print(f"The date object is: {date_object}")
    except ValueError:
        print("Invalid date format. Please use YYYY-MM-DD.")

def get_file_size(file):
    audio = MP3("example.mp3")
    file.info.length()


    

def get_post_download_task(self, file_extension: str, first_time: bool = True):
    task = None
    if file_extension.lower() in [".mp3"]:
        task = "data_handler_generate_thumbnails"
    return task



def convert_daily_report(data_file) -> Tuple[Any | None, List[str] | None]:
    # specific handler task
    data_file_path = data_file.full_path()
    # open txt file
    with File(open(data_file_path, mode='rb'), os.path.split(data_file_path)[1]) as txt_file:
        report_dict = parse_report_file(txt_file)

        report_dict['Date'] = [dateutil.parser.parse(x, dayfirst=True)
                               for x in report_dict['Date']]

        report_dict = {k.lower(): v for k, v in report_dict.items()}

        # convert to CSV file
        report_df = pd.DataFrame.from_dict(report_dict)

        # specific handling of columns
        if 'battery' in report_df.columns:
            # remove string from number
            report_df['battery'] = report_df['battery'].apply(
                lambda x: x.replace("%", ""))

        if 'temp' in report_df.columns:
            # remove string from number
            report_df['temp'] = report_df['temp'].apply(
                lambda x: x.replace(" Celsius Degree", ""))

        if 'sd' in report_df.columns:
            # split by /, remove the M, convert to number, divide.
            def divide(num_1, num_2):
                return num_1/num_2

            report_df['sd'] = report_df['sd'].apply(lambda x: divide(*[int(y.replace("M", ""))
                                                                       for y in x.split("/")]))

        # rename columns more informatively or to skip in plotting
        report_df = report_df.rename(columns={"imei": "imei__",
                                              "csq": "csq__",
                                              "temp": "temp__temperature_degrees_celsius",
                                              "battery": "battery__battery_%",
                                              "sd": "sd__proportion_sd"})
        
        # update file object
        data_file.file_size = os.stat(data_file).st_size
        data_file.modified_on = datetime.now()
        data_file.file_format = ".mp3"

        # remove original file
        os.remove(data_file_path)

        return data_file, [
            "file_size", "modified_on", "file_format"]

        # end specific handler task
