import { useState, useEffect, useCallback, useRef } from 'react';
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
    checkCanModerateGallery,
    checkCanUploadToGallery,
    getPhotoBookmarks,
    type Gallery,
    type GalleryPhoto,
    type GalleryAlbum,
    type KeysetCursor,
} from '@/data/services/galleryService';

const GRID_PAGE_SIZE_MOBILE = 30;
const GRID_PAGE_SIZE_DESKTOP = 48;
const getGridPageSize = () =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? GRID_PAGE_SIZE_MOBILE : GRID_PAGE_SIZE_DESKTOP;

export function usePortalGalleryData(galleryId?: string) {
    const { id: paramId } = useParams<{ id: string }>();
    const id = galleryId || paramId;

    const { context, isReady } = useUserContext();
    useI18n();

    const { filters, setFilters, clearFilters, setDensity } = usePhotoFilters({
        viewKey: `photosGallery:${id || 'unknown'}`,
        defaultSort: 'recent',
        allowedSorts: ['recent', 'oldest'],
        defaultStatus: 'all',
        allowedStatuses: ['all', 'approved', 'pending', 'rejected'], // Only relevant if canModerate
        persistDensity: true,
    });

    const [gallery, setGallery] = useState<Gallery | null>(null);
    const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [albums, setAlbums] = useState<GalleryAlbum[]>([]);
    const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
    const [canModerate, setCanModerate] = useState(false);
    const [canUpload, setCanUpload] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [gridPageSize, setGridPageSize] = useState(getGridPageSize);

    const cursorRef = useRef<KeysetCursor | null>(null);
    const loadingMoreRef = useRef(false);
    const mountedRef = useRef(true);

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
        if (!isReady || !id || !context) return;
        setError(null);
        const galleryResult = await getGalleryById(context, id);

        if (!mountedRef.current) return;

        if (galleryResult.error) {
            setError(galleryResult.error.message);
            return;
        }

        setGallery(galleryResult.data);

        if (galleryResult.data) {
            const [moderateResult, uploadResult] = await Promise.all([
                checkCanModerateGallery(context, galleryResult.data.id),
                checkCanUploadToGallery(context, galleryResult.data.id),
            ]);
            if (!mountedRef.current) return;
            setCanModerate(moderateResult.allowed);
            setCanUpload(uploadResult.allowed);
        }
    }, [context, isReady, id]);

    const loadAlbums = useCallback(async () => {
        if (!isReady || !id || !context) return;
        const { data, error: albumsError } = await getAlbumsForGallery(context, id);
        if (!mountedRef.current) return;
        if (albumsError) {
            showError(albumsError.message);
            return;
        }
        setAlbums(data);
    }, [context, isReady, id]);

    const loadPhotos = useCallback(async (reset: boolean): Promise<GalleryPhoto[] | null> => {
        if (!isReady || !id || !context) return null;
        if (loadingMoreRef.current && !reset) return null;

        if (reset) {
            setLoading(true);
            cursorRef.current = null;
            setHasMore(true);
        } else {
            loadingMoreRef.current = true;
            setLoadingMore(true);
        }

        const albumId = filters.album && filters.album !== 'favorites' ? filters.album : undefined;

        // Status filter logic from original file:
        // const statusFilter = canModerate && filters.status !== 'all' ? (filters.status as any) : undefined
        // But canModerate depends on async check. We need `canModerate` state to be ready?
        // Actually `canModerate` is updated in `loadGallery`.
        // It's safer to not filter by status for fan view unless canModerate is true?
        // Let's assume default unless explicitly set.

        const query = buildPhotoQuery(filters, {
            gallery_id: id,
            album_id: albumId,
            status: canModerate && filters.status !== 'all' ? (filters.status as any) : undefined,
            limit: gridPageSize,
        });

        const { data, error: photosError } = await getPhotosForGallery(context, {
            ...query,
            cursor: !reset ? cursorRef.current || undefined : undefined,
        });

        if (!mountedRef.current) return null;

        if (photosError) {
            setError(photosError.message);
            setLoading(false);
            loadingMoreRef.current = false;
            setLoadingMore(false);
            return null;
        }

        if (reset) {
            setPhotos(data || []);
        } else {
            setPhotos((prev) => [...prev, ...(data || [])]);
        }

        const last = data && data.length > 0 ? data[data.length - 1] : null;
        cursorRef.current = last ? { created_at: last.created_at, id: last.id } : cursorRef.current;
        setHasMore((data || []).length === gridPageSize);

        if (data && data.length > 0 && context.userId) {
            const bookmarkResult = await getPhotoBookmarks(context, data.map((photo) => photo.id));
            if (bookmarkResult.error) {
                // silent error or toast?
            } else {
                setBookmarkedIds((prev) => {
                    const next = reset ? new Set<string>() : new Set(prev);
                    bookmarkResult.data.forEach((id) => next.add(id));
                    return next;
                });
            }
        } else if (reset) {
            setBookmarkedIds(new Set());
        }

        setLoading(false);
        loadingMoreRef.current = false;
        setLoadingMore(false);
        return data || null;
    }, [context, isReady, id, filters, gridPageSize, canModerate]);

    useEffect(() => {
        loadGallery();
        loadAlbums();
    }, [loadGallery, loadAlbums]);

    // Initial load once gallery is ready?
    // Or just loadPhotos when ID is ready.
    useEffect(() => {
        loadPhotos(true);
    }, [id, context, filters.q, filters.album, filters.athlete, filters.sort, filters.status, filters.from, filters.to, gridPageSize]);
    // removed `loadPhotos` from dependency array to avoid infinite loop -> wait, `loadPhotos` is stable due to useCallback?
    // Yes but `canModerate` changes.

    useInfinitePhotos({
        hasMore,
        isLoading: loading || loadingMore,
        onLoadMore: () => loadPhotos(false),
    });

    return {
        gallery,
        photos,
        loading,
        loadingMore,
        error,
        albums,
        bookmarkedIds,
        canModerate,
        canUpload,
        filters,
        setFilters,
        clearFilters,
        setDensity,
        setBookmarkedIds,
        refreshPhotos: () => loadPhotos(true)
    };
}
