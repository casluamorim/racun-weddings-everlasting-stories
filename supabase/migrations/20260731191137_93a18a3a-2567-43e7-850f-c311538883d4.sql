GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_gallery_by_token(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_gallery_view(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remove_gallery_favorite(uuid, text) TO anon, authenticated;