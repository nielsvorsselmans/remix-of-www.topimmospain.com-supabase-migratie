ALTER TABLE info_evening_events 
ADD COLUMN doors_open_time time DEFAULT '19:30:00',
ADD COLUMN presentation_start_time time DEFAULT '20:00:00', 
ADD COLUMN presentation_end_time time DEFAULT '21:15:00';