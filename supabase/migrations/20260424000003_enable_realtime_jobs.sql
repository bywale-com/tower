-- Enable Realtime on jobs so DiscoverSearch.tsx Realtime subscription fires on stage changes
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
