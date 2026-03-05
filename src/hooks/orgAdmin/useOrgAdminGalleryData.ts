import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useUserContext } from '@/hooks/useUserContext';
import { useI18n } from '@/i18n/useI18n';
import { usePhotoFilters } from '@/hooks/usePhotoFilters';
import { useInfinitePhotos } from '@/hooks/useInfinitePhotos';
import { buildPhotoQuery } from '@/utils/buildPhotoQuery';
import { showError } from '@/utils/toast';
import {
    getGalleryById,
    getAlbumsForGallery,
    getPhotosForGallery,
    type Gallery,
    type GalleryPhoto,
    type GalleryAlbum,
    type KeysetCursor,
} from '@/data/services/galleryService';

const MAX_PHOTOS_PER_GALLERY = 25;
const GRID_PAGE_SIZE_MOBILE = 30;
const GRID_PAGE_SIZE_DESKTOP = 48;

const getGridPageSize = () =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? GRID_PAGE_SIZE_MOBILE : GRID_PAGE_SIZE_DESKTOP;

export function useOrgAdminGalleryData(galleryId?: string) {
    const { id: paramId } = useParams<{ id: string }>();
    const id = galleryId || paramId;

    const { context } = useUserContext();
    useI18n();

    const { filters, setFilters, clearFilters, setDensity } = usePhotoFilters({
        viewKey: `adminGallery:${id || 'unknown'}`,
        defaultSort: 'recent',
        allowedSorts: ['recent', 'oldest'],
        defaultStatus: 'all',
        allowedStatuses: ['all', 'approved', 'pending', 'rejected'],
        persistDensity: true,
    });

    const [gallery, setGallery] = useState<Gallery | null>(null);
    const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [albums, setAlbums] = useState<GalleryAlbum[]>([]);
    const cursorRef = useRef<KeysetCursor | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [gridPageSize, setGridPageSize] = useState(getGridPageSize);

    const mountedRef = useRef(true);
    const loadingMoreRef = useRef(false);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        const handleResize = () => {
            setGridPageSize(getGridPageSize());
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const loadGallery = useCallback(async () => {
        if (!id || !context) return;

        const { data, error } = await getGalleryById(context, id);
        if (!mountedRef.current) return;
        if (error) {
            showError(error.message);
            return;
        }
        setGallery(data || null);
    }, [id, context]);

    const loadAlbums = useCallback(async () => {
        if (!id || !context) return;
        const { data, error } = await getAlbumsForGallery(context, id);
        if (!mountedRef.current) return;
        if (error) {
            showError(error.message);
            return;
        }
        setAlbums(data);
    }, [id, context]);

    const loadPhotos = useCallback(async (reset: boolean): Promise<GalleryPhoto[] | null> => {
        if (!id || !context) return null;
        if (loadingMoreRef.current && !reset) return null;

        if (reset) {
            setLoading(true);
            loadingMoreRef.current = false;
            cursorRef.current = null;
            setHasMore(true);
        } else {
            loadingMoreRef.current = true;
            setLoadingMore(true);
        }

        const albumId = filters.album && filters.album !== 'favorites' ? filters.album : undefined;
        const query = buildPhotoQuery(filters, {
            gallery_id: id,
            album_id: albumId,
            limit: gridPageSize,
        });

        const { data, error } = await getPhotosForGallery(context, {
            ...query,
            cursor: !reset ? cursorRef.current || undefined : undefined,
        });

        if (!mountedRef.current) return null;

        if (error) {
            showError(error.message);
        } else {
            setPhotos((prev) => (reset ? data : [...prev, ...data]));
            const last = data[data.length - 1];
            cursorRef.current = last ? { created_at: last.created_at, id: last.id } : cursorRef.current;
            setHasMore(data.length === gridPageSize);
        }

        setLoading(false);
        loadingMoreRef.current = false;
        setLoadingMore(false);
        return data || null;
    }, [id, context, filters, gridPageSize]);

    useEffect(() => {
        loadGallery();
        loadAlbums();
    }, [loadGallery, loadAlbums]);

    useEffect(() => {
        loadPhotos(true);
    }, [id, context, filters.q, filters.album, filters.athlete, filters.sort, filters.status, filters.from, filters.to, gridPageSize]);

    useInfinitePhotos({
        hasMore,
        isLoading: loading || loadingMore,
        onLoadMore: () => loadPhotos(false),
    });

    const photoStats = useMemo(() => {
        const approved = photos.filter((p) => p.approval_status === 'approved').length;
        const pending = photos.filter((p) => p.approval_status === 'pending').length;
        const flagged = photos.filter((p) => p.approval_status === 'rejected').length;
        const total = photos.length;
        const remaining = Math.max(0, MAX_PHOTOS_PER_GALLERY - total);
        const limitReached = total >= MAX_PHOTOS_PER_GALLERY;

        return { approved, pending, flagged, total, remaining, limitReached };
    }, [photos]);

    return {
        gallery,
        photos,
        albums,
        loading,
        loadingMore,
        filters,
        setFilters,
        clearFilters,
        setDensity,
        hasMore,
        photoStats,
        loadPhotos,
        loadGallery,
        loadAlbums
    };
}
