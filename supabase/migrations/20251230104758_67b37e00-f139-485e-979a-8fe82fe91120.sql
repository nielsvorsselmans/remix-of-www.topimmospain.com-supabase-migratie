-- First, delete existing example events
DELETE FROM public.info_evening_events;

-- Insert correct events based on user's screenshot (February 2025)
INSERT INTO public.info_evening_events (title, date, time, location_name, location_address, max_capacity, active)
VALUES
  ('Infoavond Eindhoven', '2025-02-04', '19:30', 'Eindhoven', 'Locatie wordt nog bevestigd', 50, true),
  ('Infoavond Zuid-Holland', '2025-02-05', '19:30', 'Zuid-Holland', 'Locatie wordt nog bevestigd', 50, true),
  ('Infoavond Utrecht', '2025-02-06', '19:30', 'Utrecht', 'Locatie wordt nog bevestigd', 50, true),
  ('Infoavond Aalst', '2025-02-07', '19:30', 'Aalst', 'Locatie wordt nog bevestigd', 50, true);