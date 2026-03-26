-- Enable realtime for snagging tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.snagging_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.snagging_photos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.snagging_inspections;