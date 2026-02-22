import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { PageHeader, Badge, Card, Button, PlatformDataTable, type ColumnConfig, OfflineBanner, ErrorState, Tabs, TabsTrigger, TabsContent, Modal, Input, Switch, Select, ConfirmDialog } from '../../components/platformAdmin'
import { EntitySelect } from '../../components/common/EntitySelect'
import { isRpcSuccessResponse } from '../../utils/typeAdapters'
import { isValidUuid } from '../../utils/uuid'
import { isNotFoundError } from '../../utils/errorUtils'
import { mapFeatureFlag, mapFeatureFlagOverride, mapFeatureFlagAuditLog } from '../../utils/domainMappers'
import { getLink } from '../../utils/routes'
import { t } from '../../i18n'
import { showSuccess, showError } from '../../utils/toast'
import type { FeatureFlag, FeatureFlagOverride, FeatureFlagAuditLog, RpcResponse } from '../../types/domain/FeatureFlag'

import { useDebugLifecycle } from '../../lib/debug/integrations/useDebugLifecycle'

export default function FeatureFlagDetail() {
  useDebugLifecycle('FeatureFlagDetail')
  
  const db = supabase as any
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [flag, setFlag] = useState<FeatureFlag | null>(null)
  const [flagsByEnv, setFlagsByEnv] = useState<Record<'dev' | 'staging' | 'prod', FeatureFlag | null>>({
    dev: null,
    staging: null,
    prod: null,
  })
  const [overrides, setOverrides] = useState<FeatureFlagOverride[]>([])
  const [auditLog, setAuditLog] = useState<FeatureFlagAuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [activeTab, setActiveTab] = useState<'overrides' | 'audit'>('overrides')
  
  // Edit default value state per environment
  const [editingEnv, setEditingEnv] = useState<'dev' | 'staging' | 'prod' | null>(null)
  const [editValue, setEditValue] = useState<{ boolean?: boolean; integer?: number; double?: number }>({})
  const [editReason, setEditReason] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Inline description edit
  const [editingDescription, setEditingDescription] = useState(false)
  const [descriptionEditValue, setDescriptionEditValue] = useState('')
  const [descriptionSaving, setDescriptionSaving] = useState(false)

  // Add org override modal
  const [addOrgOverrideOpen, setAddOrgOverrideOpen] = useState(false)
  const [addOrgOverrideEnv, setAddOrgOverrideEnv] = useState<'dev' | 'staging' | 'prod' | null>(null)
  const [addOrgOverrideOrgId, setAddOrgOverrideOrgId] = useState<string | null>(null)
  const [addOrgOverrideValue, setAddOrgOverrideValue] = useState<{ boolean?: boolean; integer?: number; double?: number }>({})
  const [addOrgOverrideReason, setAddOrgOverrideReason] = useState('')
  const [addOrgOverrideLoading, setAddOrgOverrideLoading] = useState(false)
  const [addOrgOverrideError, setAddOrgOverrideError] = useState<string | null>(null)

  // Add user override modal
  const [addUserOverrideOpen, setAddUserOverrideOpen] = useState(false)
  const [addUserOverrideEnv, setAddUserOverrideEnv] = useState<'dev' | 'staging' | 'prod' | null>(null)
  const [addUserOverrideUserId, setAddUserOverrideUserId] = useState<string | null>(null)
  const [addUserOverrideValue, setAddUserOverrideValue] = useState<{ boolean?: boolean; integer?: number; double?: number }>({})
  const [addUserOverrideReason, setAddUserOverrideReason] = useState('')
  const [addUserOverrideLoading, setAddUserOverrideLoading] = useState(false)
  const [addUserOverrideError, setAddUserOverrideError] = useState<string | null>(null)

  // Edit override modal
  const [overrideToEdit, setOverrideToEdit] = useState<FeatureFlagOverride | null>(null)
  const [editOverrideValue, setEditOverrideValue] = useState<{ boolean?: boolean; integer?: number; double?: number }>({})
  const [editOverrideReason, setEditOverrideReason] = useState('')
  const [editOverrideLoading, setEditOverrideLoading] = useState(false)
  const [editOverrideError, setEditOverrideError] = useState<string | null>(null)

  // Remove override confirmation
  const [overrideToRemove, setOverrideToRemove] = useState<FeatureFlagOverride | null>(null)
  const [removeOverrideLoading, setRemoveOverrideLoading] = useState(false)
  const [removeOverrideError, setRemoveOverrideError] = useState<string | null>(null)

  // Org logos for overrides table and edit modal (org id -> logo_url)
  const [orgLogoUrls, setOrgLogoUrls] = useState<Record<string, string>>({})
  
  // Validate route parameter
  const isValidId = useMemo(() => {
    if (!id) return false
    return isValidUuid(id)
  }, [id])
  
  const fetchFlag = useCallback(async () => {
    if (!id || !isValidId) {
      if (!isValidId && id) {
        setError(t('platformAdmin.featureFlags.detail.invalidId'))
      }
      setLoading(false)
      return
    }
    
    setLoading(true)
    setError(null)
    setNotFound(false)
    
    try {
      // First fetch the flag by ID to get the key
      const { data: flagData, error: flagError } = await db
        .from('admin_feature_flags_list')
        .select('*')
        .eq('id', id)
        .single()
      
      if (flagError) {
        if (isNotFoundError(flagError)) {
          setNotFound(true)
          setFlag(null)
        } else {
          setError(flagError.message || t('platformAdmin.featureFlags.detail.loadFailed'))
          setFlag(null)
        }
        setLoading(false)
        return
      }
      
      if (!flagData) {
        setNotFound(true)
        setFlag(null)
        setLoading(false)
        return
      }
      
      const initialFlag = mapFeatureFlag(flagData)
      setFlag(initialFlag)
      
      // Now fetch all environments for this flag key
      const { data: allEnvData, error: allEnvError } = await db
        .from('admin_feature_flags_list')
        .select('*')
        .eq('key', initialFlag.key)
        .is('deleted_at', null)
      
      if (allEnvError) {
        console.error('Error fetching all environments:', allEnvError)
        // Continue with just the initial flag
        setFlagsByEnv({
          dev: initialFlag.environment === 'dev' ? initialFlag : null,
          staging: initialFlag.environment === 'staging' ? initialFlag : null,
          prod: initialFlag.environment === 'prod' ? initialFlag : null,
        })
      } else {
        const flagsMap: Record<'dev' | 'staging' | 'prod', FeatureFlag | null> = {
          dev: null,
          staging: null,
          prod: null,
        }
        
        allEnvData?.forEach((row: any) => {
          const mappedFlag = mapFeatureFlag(row)
          flagsMap[mappedFlag.environment] = mappedFlag
        })
        
        setFlagsByEnv(flagsMap)
      }
      
      setError(null)
    } catch (err) {
      console.error('Error fetching flag:', err)
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error('Error details:', errorMessage)
      setError(errorMessage || t('errors.unknownError'))
      setFlag(null)
    } finally {
      setLoading(false)
    }
  }, [id, isValidId])
  
  const fetchOverrides = useCallback(async () => {
    if (!flag) return
    
    try {
      // Fetch overrides for all environments of this flag
      const flagIds = Object.values(flagsByEnv)
        .filter((f): f is FeatureFlag => f !== null)
        .map(f => f.id)
      
      if (flagIds.length === 0) {
        setOverrides([])
        return
      }
      
      const { data, error } = await db
        .from('admin_feature_flag_overrides')
        .select('*')
        .in('feature_flag_id', flagIds)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching overrides:', error)
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
        setOverrides([])
      } else {
        // Map rows to include id field
        const mapped = (data || []).map((row: any) => mapFeatureFlagOverride(row))
        setOverrides(mapped)
      }
    } catch (err) {
      console.error('Error in fetchOverrides:', err)
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error('Error details:', errorMessage)
      setOverrides([])
    }
  }, [flag, flagsByEnv])
  
  const fetchAuditLog = useCallback(async () => {
    if (!flag) return
    
    try {
      // Fetch audit log for all environments of this flag
      const flagIds = Object.values(flagsByEnv)
        .filter((f): f is FeatureFlag => f !== null)
        .map(f => f.id)
      
      if (flagIds.length === 0) {
        setAuditLog([])
        return
      }
      
      const { data, error } = await db
        .from('admin_feature_flag_audit')
        .select('*')
        .in('feature_flag_id', flagIds)
        .order('created_at', { ascending: false })
        .limit(100)
      
      if (error) {
        console.error('Error fetching audit log:', error)
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
        setAuditLog([])
      } else {
        setAuditLog((data || []).map((row: any) => mapFeatureFlagAuditLog(row)))
      }
    } catch (err) {
      console.error('Error in fetchAuditLog:', err)
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error('Error details:', errorMessage)
      setAuditLog([])
    }
  }, [flag, flagsByEnv])
  
  const openEditDefaultDialog = useCallback((env: 'dev' | 'staging' | 'prod') => {
    if (!flag) return
    
    setEditingEnv(env)
    const envFlag = flagsByEnv[env]
    
    // Initialize with current value if exists, otherwise defaults
    if (envFlag) {
      if (flag.valueType === 'boolean') {
        setEditValue({ boolean: envFlag.defaultValueBoolean ?? false })
      } else if (flag.valueType === 'integer') {
        setEditValue({ integer: envFlag.defaultValueInteger ?? 0 })
      } else if (flag.valueType === 'double') {
        setEditValue({ double: envFlag.defaultValueDouble ?? 0 })
      }
    } else {
      // No flag exists for this environment - use defaults
      if (flag.valueType === 'boolean') {
        setEditValue({ boolean: false })
      } else if (flag.valueType === 'integer') {
        setEditValue({ integer: 0 })
      } else if (flag.valueType === 'double') {
        setEditValue({ double: 0.0 })
      }
    }
    setEditReason('')
    setEditError(null)
  }, [flagsByEnv, flag])
  
  const handleSaveDefaultValue = async () => {
    if (!editingEnv || !flag) return
    
    // Validate that exactly one value type is set
    const valueCount = (editValue.boolean !== undefined ? 1 : 0) + 
                       (editValue.integer !== undefined ? 1 : 0) + 
                       (editValue.double !== undefined ? 1 : 0)
    
    if (valueCount !== 1) {
      setEditError(t('platformAdmin.featureFlags.detail.exactlyOneValueRequired'))
      return
    }
    
    if (!editReason.trim()) {
      setEditError(t('platformAdmin.featureFlags.detail.reasonRequired'))
      return
    }
    
    setEditLoading(true)
    setEditError(null)
    
    try {
      let envFlag = flagsByEnv[editingEnv]
      
      // If flag doesn't exist for this environment, create it first
      if (!envFlag) {
        const { data: createData, error: createError } = await db
          .from('feature_flags')
          .insert({
            key: flag.key,
            value_type: flag.valueType,
            description: flag.description,
            environment: editingEnv,
            org_id: null,
          })
          .select()
          .single()
        
        if (createError) {
          setEditError(createError.message || 'Failed to create flag for this environment')
          return
        }
        
        // Map the created flag
        envFlag = mapFeatureFlag({
          ...createData,
          default_value_boolean: null,
          default_value_integer: null,
          default_value_double: null,
          org_override_count: 0,
          user_override_count: 0,
        })
      }
      
      // Now set the platform default
      const { data, error } = await supabase.rpc('admin_set_platform_default', {
        p_feature_flag_id: envFlag.id,
        p_value_boolean: editValue.boolean ?? null,
        p_value_integer: editValue.integer ?? null,
        p_value_double: editValue.double ?? null,
        p_environment: editingEnv,
        p_reason: editReason.trim(),
        p_expected_version: envFlag.version,
      } as any)
      
      if (error) {
        setEditError(error.message)
        return
      }
      
      const response = data as RpcResponse | null
      if (!response?.success) {
        setEditError(response?.error || t('errors.unknownError'))
        return
      }
      
      setEditingEnv(null)
      showSuccess(t('platformAdmin.featureFlags.detail.defaultValueUpdated'))
      fetchFlag()
      fetchAuditLog()
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      setEditError(errMsg)
      showError(errMsg)
    } finally {
      setEditLoading(false)
    }
  }

  const startEditingDescription = useCallback(() => {
    setDescriptionEditValue(flag?.description ?? '')
    setEditingDescription(true)
  }, [flag?.description])

  const cancelEditingDescription = useCallback(() => {
    setEditingDescription(false)
    setDescriptionEditValue('')
  }, [])

  const saveDescription = useCallback(async () => {
    if (!flag) return
    const value = descriptionEditValue.trim() || null
    setDescriptionSaving(true)
    try {
      const { error } = await supabase
        .from('feature_flags')
        .update({ description: value })
        .eq('key', flag.key)
        .is('org_id', null)
      if (error) throw error
      setEditingDescription(false)
      setDescriptionEditValue('')
      setFlag((prev) => (prev ? { ...prev, description: value } : null))
      setFlagsByEnv((prev) => {
        const next = { ...prev }
        ;(['dev', 'staging', 'prod'] as const).forEach((env) => {
          if (next[env]) next[env] = { ...next[env]!, description: value }
        })
        return next
      })
      showSuccess(t('platformAdmin.featureFlags.detail.descriptionUpdated'))
    } catch (err) {
      showError(err instanceof Error ? err.message : String(err))
    } finally {
      setDescriptionSaving(false)
    }
  }, [flag, descriptionEditValue])

  // Available environments (with a flag) and default for add-override modals
  const overrideEnvOptions = useMemo(() => {
    const envs: Array<'dev' | 'staging' | 'prod'> = []
    if (flagsByEnv.dev) envs.push('dev')
    if (flagsByEnv.staging) envs.push('staging')
    if (flagsByEnv.prod) envs.push('prod')
    return envs
  }, [flagsByEnv])
  const defaultOverrideEnv = overrideEnvOptions[0] ?? null

  const openAddOrgOverride = useCallback(() => {
    setAddOrgOverrideEnv(defaultOverrideEnv)
    setAddOrgOverrideOrgId(null)
    setAddOrgOverrideValue({})
    setAddOrgOverrideReason('')
    setAddOrgOverrideError(null)
    setAddOrgOverrideOpen(true)
  }, [defaultOverrideEnv])

  const closeAddOrgOverride = useCallback(() => {
    setAddOrgOverrideOpen(false)
    setAddOrgOverrideError(null)
  }, [])

  const openAddUserOverride = useCallback(() => {
    setAddUserOverrideEnv(defaultOverrideEnv)
    setAddUserOverrideUserId(null)
    setAddUserOverrideValue({})
    setAddUserOverrideReason('')
    setAddUserOverrideError(null)
    setAddUserOverrideOpen(true)
  }, [defaultOverrideEnv])

  const closeAddUserOverride = useCallback(() => {
    setAddUserOverrideOpen(false)
    setAddUserOverrideError(null)
  }, [])

  const handleSetOrgOverride = useCallback(async () => {
    if (!flag || !addOrgOverrideEnv || !addOrgOverrideOrgId) return
    const envFlag = flagsByEnv[addOrgOverrideEnv]
    if (!envFlag) {
      setAddOrgOverrideError(t('platformAdmin.featureFlags.detail.noFlagForEnvironment'))
      return
    }
    const valueCount = (addOrgOverrideValue.boolean !== undefined ? 1 : 0) +
      (addOrgOverrideValue.integer !== undefined ? 1 : 0) +
      (addOrgOverrideValue.double !== undefined ? 1 : 0)
    if (valueCount !== 1) {
      setAddOrgOverrideError(t('platformAdmin.featureFlags.detail.exactlyOneValueRequired'))
      return
    }
    if (!addOrgOverrideReason.trim()) {
      setAddOrgOverrideError(t('platformAdmin.featureFlags.detail.reasonRequired'))
      return
    }
    setAddOrgOverrideLoading(true)
    setAddOrgOverrideError(null)
    try {
      const existing = overrides.find(
        o => o.featureFlagId === envFlag.id && o.scopeId === addOrgOverrideOrgId && o.overrideType === 'org'
      )
      const { data, error } = await supabase.rpc('admin_set_org_override', {
        p_feature_flag_id: envFlag.id,
        p_org_id: addOrgOverrideOrgId,
        p_value_boolean: addOrgOverrideValue.boolean ?? null,
        p_value_integer: addOrgOverrideValue.integer ?? null,
        p_value_double: addOrgOverrideValue.double ?? null,
        p_environment: addOrgOverrideEnv,
        p_reason: addOrgOverrideReason.trim(),
        p_expected_version: existing?.version ?? null,
      } as any)
      if (error) {
        setAddOrgOverrideError(error.message)
        return
      }
      if (!isRpcSuccessResponse(data) || !(data as RpcResponse).success) {
        setAddOrgOverrideError((data as RpcResponse)?.error ?? t('errors.unknownError'))
        return
      }
      closeAddOrgOverride()
      showSuccess(t('platformAdmin.featureFlags.detail.orgOverrideSetSuccess'))
      fetchOverrides()
      fetchAuditLog()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setAddOrgOverrideError(msg)
      showError(msg)
    } finally {
      setAddOrgOverrideLoading(false)
    }
  }, [flag, addOrgOverrideEnv, addOrgOverrideOrgId, addOrgOverrideValue, addOrgOverrideReason, flagsByEnv, overrides, closeAddOrgOverride, fetchOverrides, fetchAuditLog])

  const handleSetUserOverride = useCallback(async () => {
    if (!flag || !addUserOverrideEnv || !addUserOverrideUserId) return
    const envFlag = flagsByEnv[addUserOverrideEnv]
    if (!envFlag) {
      setAddUserOverrideError(t('platformAdmin.featureFlags.detail.noFlagForEnvironment'))
      return
    }
    const valueCount = (addUserOverrideValue.boolean !== undefined ? 1 : 0) +
      (addUserOverrideValue.integer !== undefined ? 1 : 0) +
      (addUserOverrideValue.double !== undefined ? 1 : 0)
    if (valueCount !== 1) {
      setAddUserOverrideError(t('platformAdmin.featureFlags.detail.exactlyOneValueRequired'))
      return
    }
    if (!addUserOverrideReason.trim()) {
      setAddUserOverrideError(t('platformAdmin.featureFlags.detail.reasonRequired'))
      return
    }
    setAddUserOverrideLoading(true)
    setAddUserOverrideError(null)
    try {
      const existing = overrides.find(
        o => o.featureFlagId === envFlag.id && o.scopeId === addUserOverrideUserId && o.overrideType === 'user'
      )
      const { data, error } = await supabase.rpc('admin_set_user_override', {
        p_feature_flag_id: envFlag.id,
        p_user_id: addUserOverrideUserId,
        p_value_boolean: addUserOverrideValue.boolean ?? null,
        p_value_integer: addUserOverrideValue.integer ?? null,
        p_value_double: addUserOverrideValue.double ?? null,
        p_environment: addUserOverrideEnv,
        p_reason: addUserOverrideReason.trim(),
        p_expected_version: existing?.version ?? null,
      } as any)
      if (error) {
        setAddUserOverrideError(error.message)
        return
      }
      if (!isRpcSuccessResponse(data) || !(data as RpcResponse).success) {
        setAddUserOverrideError((data as RpcResponse)?.error ?? t('errors.unknownError'))
        return
      }
      closeAddUserOverride()
      showSuccess(t('platformAdmin.featureFlags.detail.userOverrideSetSuccess'))
      fetchOverrides()
      fetchAuditLog()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setAddUserOverrideError(msg)
      showError(msg)
    } finally {
      setAddUserOverrideLoading(false)
    }
  }, [flag, addUserOverrideEnv, addUserOverrideUserId, addUserOverrideValue, addUserOverrideReason, flagsByEnv, overrides, closeAddUserOverride, fetchOverrides, fetchAuditLog])

  const openEditOverride = useCallback((override: FeatureFlagOverride) => {
    setOverrideToEdit(override)
    setEditOverrideValue({
      boolean: override.valueBoolean !== null ? override.valueBoolean : undefined,
      integer: override.valueInteger !== null ? override.valueInteger : undefined,
      double: override.valueDouble !== null ? override.valueDouble : undefined,
    })
    setEditOverrideReason('')
    setEditOverrideError(null)
  }, [])

  const closeEditOverride = useCallback(() => {
    setOverrideToEdit(null)
    setEditOverrideError(null)
  }, [])

  const handleSaveEditOverride = useCallback(async () => {
    if (!overrideToEdit || !flag) return
    const valueCount = (editOverrideValue.boolean !== undefined ? 1 : 0) +
      (editOverrideValue.integer !== undefined ? 1 : 0) +
      (editOverrideValue.double !== undefined ? 1 : 0)
    if (valueCount !== 1) {
      setEditOverrideError(t('platformAdmin.featureFlags.detail.exactlyOneValueRequired'))
      return
    }
    if (!editOverrideReason.trim()) {
      setEditOverrideError(t('platformAdmin.featureFlags.detail.reasonRequired'))
      return
    }
    setEditOverrideLoading(true)
    setEditOverrideError(null)
    try {
      const isOrg = overrideToEdit.overrideType === 'org'
      const rpcName = isOrg ? 'admin_set_org_override' : 'admin_set_user_override'
      const params = isOrg
        ? {
            p_feature_flag_id: overrideToEdit.featureFlagId,
            p_org_id: overrideToEdit.scopeId,
            p_value_boolean: editOverrideValue.boolean ?? null,
            p_value_integer: editOverrideValue.integer ?? null,
            p_value_double: editOverrideValue.double ?? null,
            p_environment: overrideToEdit.environment,
            p_reason: editOverrideReason.trim(),
            p_expected_version: overrideToEdit.version,
          }
        : {
            p_feature_flag_id: overrideToEdit.featureFlagId,
            p_user_id: overrideToEdit.scopeId,
            p_value_boolean: editOverrideValue.boolean ?? null,
            p_value_integer: editOverrideValue.integer ?? null,
            p_value_double: editOverrideValue.double ?? null,
            p_environment: overrideToEdit.environment,
            p_reason: editOverrideReason.trim(),
            p_expected_version: overrideToEdit.version,
          }
      const { data, error } = await supabase.rpc(rpcName, params as any)
      if (error) {
        setEditOverrideError(error.message)
        return
      }
      if (!isRpcSuccessResponse(data) || !(data as RpcResponse).success) {
        setEditOverrideError((data as RpcResponse)?.error ?? t('errors.unknownError'))
        return
      }
      closeEditOverride()
      showSuccess(isOrg ? t('platformAdmin.featureFlags.detail.orgOverrideSetSuccess') : t('platformAdmin.featureFlags.detail.userOverrideSetSuccess'))
      fetchOverrides()
      fetchAuditLog()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setEditOverrideError(msg)
      showError(msg)
    } finally {
      setEditOverrideLoading(false)
    }
  }, [overrideToEdit, flag, editOverrideValue, editOverrideReason, closeEditOverride, fetchOverrides, fetchAuditLog])

  const handleRemoveOverride = useCallback(async (reason: string) => {
    if (!overrideToRemove) return
    setRemoveOverrideLoading(true)
    setRemoveOverrideError(null)
    try {
      const isOrg = overrideToRemove.overrideType === 'org'
      const rpcName = isOrg ? 'admin_remove_org_override' : 'admin_remove_user_override'
      const params = isOrg
        ? {
            p_feature_flag_id: overrideToRemove.featureFlagId,
            p_org_id: overrideToRemove.scopeId,
            p_environment: overrideToRemove.environment,
            p_reason: reason.trim(),
            p_expected_version: overrideToRemove.version,
          }
        : {
            p_feature_flag_id: overrideToRemove.featureFlagId,
            p_user_id: overrideToRemove.scopeId,
            p_environment: overrideToRemove.environment,
            p_reason: reason.trim(),
            p_expected_version: overrideToRemove.version,
          }
      const { data, error } = await supabase.rpc(rpcName, params as any)
      if (error) {
        setRemoveOverrideError(error.message)
        return
      }
      if (!isRpcSuccessResponse(data) || !(data as RpcResponse).success) {
        setRemoveOverrideError((data as RpcResponse)?.error ?? t('errors.unknownError'))
        return
      }
      setOverrideToRemove(null)
      showSuccess(t('platformAdmin.featureFlags.detail.overrideRemovedSuccess'))
      fetchOverrides()
      fetchAuditLog()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setRemoveOverrideError(msg)
      showError(msg)
    } finally {
      setRemoveOverrideLoading(false)
    }
  }, [overrideToRemove, fetchOverrides, fetchAuditLog])

  useEffect(() => {
    fetchFlag()
  }, [fetchFlag])
  
  useEffect(() => {
    if (activeTab === 'overrides') {
      fetchOverrides()
    } else {
      fetchAuditLog()
    }
  }, [activeTab, fetchOverrides, fetchAuditLog])

  // Fetch org logo_url for org overrides (table + edit modal)
  useEffect(() => {
    const orgIds = [...new Set(overrides.filter(o => o.overrideType === 'org').map(o => o.scopeId))]
    if (orgIds.length === 0) {
      setOrgLogoUrls({})
      return
    }
    let cancelled = false
    supabase
      .from('organizations')
      .select('id, logo_url')
      .in('id', orgIds)
      .then(({ data, error }) => {
        if (cancelled || error) return
        const map: Record<string, string> = {}
        ;(data ?? []).forEach((row: { id: string; logo_url: string | null }) => {
          if (row.logo_url) map[row.id] = row.logo_url
        })
        if (!cancelled) setOrgLogoUrls(map)
      })
    return () => { cancelled = true }
  }, [overrides])
  
  const overrideColumns: ColumnConfig<FeatureFlagOverride & { id: string }>[] = [
    {
      id: 'override_type',
      label: t('platformAdmin.featureFlags.detail.overrideType'),
      render: (row: FeatureFlagOverride & { id: string }) => (
        <Badge variant={row.overrideType === 'org' ? 'info' : 'warning'}>
          {row.overrideType === 'org' ? t('platformAdmin.featureFlags.detail.organization') : t('platformAdmin.featureFlags.detail.user')}
        </Badge>
      ),
    },
    {
      id: 'scope_name',
      label: t('platformAdmin.featureFlags.detail.scope'),
      render: (row: FeatureFlagOverride & { id: string }) => (
        <div className="pa-body-m pa-ff-detail-cell-value pa-flex pa-items-center pa-gap-2">
          {row.overrideType === 'org' && orgLogoUrls[row.scopeId] && (
            <img
              src={orgLogoUrls[row.scopeId]}
              alt=""
              role="presentation"
              style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'contain', flexShrink: 0 }}
            />
          )}
          <span>{row.scopeName}</span>
        </div>
      ),
    },
    {
      id: 'value',
      label: t('platformAdmin.featureFlags.detail.value'),
      render: (row: FeatureFlagOverride & { id: string }) => (
        <div className="pa-body-m">
          {row.valueBoolean !== null ? String(row.valueBoolean) :
           row.valueInteger !== null ? String(row.valueInteger) :
           row.valueDouble !== null ? String(row.valueDouble) : 'N/A'}
        </div>
      ),
    },
    {
      id: 'created_at',
      label: t('platformAdmin.featureFlags.detail.created'),
      render: (row: FeatureFlagOverride & { id: string }) => (
        <div className="pa-body-s pa-ff-detail-cell-meta">
          {new Date(row.createdAt).toLocaleString()}
        </div>
      ),
    },
    {
      id: 'actions',
      label: '',
      align: 'right',
      render: (row: FeatureFlagOverride & { id: string }) => (
        <div className="pa-flex pa-gap-2" style={{ justifyContent: 'flex-end' }}>
          <Button variant="ghost" size="small" onClick={() => openEditOverride(row)}>
            {t('platformAdmin.featureFlags.detail.editOverride')}
          </Button>
          <Button variant="ghost" size="small" onClick={() => setOverrideToRemove(row)}>
            {t('platformAdmin.featureFlags.detail.removeOverride')}
          </Button>
        </div>
      ),
    },
  ]
  
  const auditColumns: ColumnConfig<FeatureFlagAuditLog>[] = [
    {
      id: 'created_at',
      label: t('platformAdmin.featureFlags.detail.time'),
      render: (row: FeatureFlagAuditLog) => (
        <div className="pa-body-s pa-ff-detail-cell-meta">
          {new Date(row.createdAt).toLocaleString()}
        </div>
      ),
    },
    {
      id: 'action',
      label: t('platformAdmin.featureFlags.detail.action'),
      render: (row: FeatureFlagAuditLog) => (
        <Badge variant={row.action === 'delete' ? 'danger' : row.action === 'create' ? 'success' : 'info'}>
          {row.action}
        </Badge>
      ),
    },
    {
      id: 'actor_name',
      label: t('platformAdmin.featureFlags.detail.actor'),
      render: (row: FeatureFlagAuditLog) => (
        <div className="pa-body-m">
          {row.actorName || row.actorEmail || t('platformAdmin.featureFlags.detail.system')}
        </div>
      ),
    },
    {
      id: 'scope_type',
      label: t('platformAdmin.featureFlags.detail.scope'),
      render: (row: FeatureFlagAuditLog) => (
        <div className="pa-body-s pa-ff-detail-cell-meta">
          {row.scopeType || t('platformAdmin.featureFlags.detail.flag')}
        </div>
      ),
    },
    {
      id: 'scope_id',
      label: t('platformAdmin.featureFlags.detail.target'),
      render: (row: FeatureFlagAuditLog) => (
        <div className="pa-body-s pa-ff-detail-cell-meta">
          {row.scopeId || '-'}
        </div>
      ),
    },
  ]
  
  // Invalid ID
  if (!isValidId && id) {
    return (
      <div>
        <OfflineBanner />
        <button
          className="pa-btn pa-btn--ghost pa-mb-4"
          onClick={() => navigate(getLink('platformAdmin.featureFlags'))}
        >
          <span className="material-symbols-outlined">arrow_back</span>
          {t('platformAdmin.featureFlags.detail.backToFlags')}
        </button>
        <Card>
          <div className="pa-empty">
            <div className="pa-empty-icon">
              <span className="material-symbols-outlined">error</span>
            </div>
            <h3 className="pa-empty-title">{t('platformAdmin.featureFlags.detail.invalidIdTitle')}</h3>
            <p className="pa-empty-text">{t('platformAdmin.featureFlags.detail.invalidIdMessage')}</p>
          </div>
        </Card>
      </div>
    )
  }
  
  if (loading) {
    return (
      <div>
        <OfflineBanner />
        <PageHeader title={t('platformAdmin.featureFlags.detail.title')} subtitle={t('common.loading')} />
        <div className="pa-grid pa-grid-3 pa-gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="pa-card">
              <div className="pa-skeleton pa-ff-detail-skeleton-title" />
              <div className="pa-skeleton pa-ff-detail-skeleton-line" />
            </div>
          ))}
        </div>
      </div>
    )
  }
  
  // Error state with retry
  if (error && !flag) {
    return (
      <div>
        <OfflineBanner />
        <button
          className="pa-btn pa-btn--ghost pa-mb-4"
          onClick={() => navigate(getLink('platformAdmin.featureFlags'))}
        >
          <span className="material-symbols-outlined">arrow_back</span>
          {t('platformAdmin.featureFlags.detail.backToFlags')}
        </button>
        <ErrorState
          message={error}
          onRetry={fetchFlag}
          retryLabel={t('common.retry')}
        />
      </div>
    )
  }
  
  // Not found state
  if (notFound || !flag) {
    return (
      <div>
        <OfflineBanner />
        <button
          className="pa-btn pa-btn--ghost pa-mb-4"
          onClick={() => navigate(getLink('platformAdmin.featureFlags'))}
        >
          <span className="material-symbols-outlined">arrow_back</span>
          {t('platformAdmin.featureFlags.detail.backToFlags')}
        </button>
        <Card>
          <div className="pa-empty">
            <div className="pa-empty-icon">
              <span className="material-symbols-outlined">flag</span>
            </div>
            <h3 className="pa-empty-title">{t('platformAdmin.featureFlags.detail.notFoundTitle')}</h3>
            <p className="pa-empty-text">
              {t('platformAdmin.featureFlags.detail.notFoundMessage')}
            </p>
            <Button variant="primary" onClick={() => navigate(getLink('platformAdmin.featureFlags'))}>
              {t('platformAdmin.featureFlags.detail.backToFlags')}
            </Button>
          </div>
        </Card>
      </div>
    )
  }
  
  return (
    <div>
      <OfflineBanner />
      <PageHeader
        title={flag.key}
        subtitle={flag.description || t('platformAdmin.featureFlags.detail.noDescription')}
        breadcrumbs={[
          { label: 'Platform Admin', path: getLink('platformAdmin.dashboard') },
          { label: 'Feature Flags', path: getLink('platformAdmin.featureFlags') },
          { label: flag.key },
        ]}
        actions={
          <Button variant="ghost" onClick={() => navigate(getLink('platformAdmin.featureFlags'))}>
            <span className="material-symbols-outlined">arrow_back</span>
            {t('platformAdmin.featureFlags.detail.backToFlags')}
          </Button>
        }
      />
      
      {/* Flag info + Platform defaults: two cards on one row */}
      <div className="pa-grid pa-grid-2 pa-gap-4 pa-mb-4">
        <Card className="pa-ff-detail-card">
          <div className="pa-ff-flag-info">
            <div className="pa-ff-flag-info-body">
              <div className="pa-form-group">
                <div className="pa-ff-flag-info-key-label">{t('platformAdmin.featureFlags.detail.flagKey')}</div>
                <div className="pa-ff-flag-info-key-value">{flag.key}</div>
              </div>
              <div className="pa-form-group">
                <div className="pa-ff-flag-info-key-label">{t('platformAdmin.featureFlags.detail.descriptionLabel')}</div>
                {editingDescription ? (
                  <div className="pa-ff-desc-edit">
                    <textarea
                      className="pa-ff-desc-textarea"
                      value={descriptionEditValue}
                      onChange={(e) => setDescriptionEditValue(e.target.value)}
                      placeholder={t('platformAdmin.featureFlags.detail.noDescription')}
                      rows={3}
                      disabled={descriptionSaving}
                      autoFocus
                    />
                    <div className="pa-ff-desc-edit-actions">
                      <Button variant="ghost" size="small" onClick={cancelEditingDescription} disabled={descriptionSaving}>
                        {t('common.cancel')}
                      </Button>
                      <Button variant="primary" size="small" onClick={saveDescription} disabled={descriptionSaving}>
                        {descriptionSaving ? t('common.saving') : t('common.save')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="pa-ff-desc-inline"
                    onClick={startEditingDescription}
                    title={t('platformAdmin.featureFlags.detail.editDescription')}
                  >
                    {flag.description ? (
                      <span className="pa-ff-flag-info-desc">{flag.description}</span>
                    ) : (
                      <span className="pa-ff-flag-info-desc-empty">{t('platformAdmin.featureFlags.detail.noDescription')}</span>
                    )}
                    <span className="pa-ff-desc-edit-icon material-symbols-outlined" aria-hidden>edit</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card
          title={t('platformAdmin.featureFlags.detail.platformDefaultsByEnvironment')}
          className="pa-ff-detail-card"
        >
        <div className="pa-ff-env-list">
          {(['dev', 'staging', 'prod'] as const).map((env) => {
            const envFlag = flagsByEnv[env]
            const hasValue = envFlag && (
              (envFlag.valueType === 'boolean' && envFlag.defaultValueBoolean !== null) ||
              (envFlag.valueType === 'integer' && envFlag.defaultValueInteger !== null) ||
              (envFlag.valueType === 'double' && envFlag.defaultValueDouble !== null)
            )
            const valueText = envFlag && hasValue
              ? (envFlag.valueType === 'boolean'
                  ? String(envFlag.defaultValueBoolean)
                  : envFlag.valueType === 'integer'
                    ? String(envFlag.defaultValueInteger)
                    : String(envFlag.defaultValueDouble))
              : null

            return (
              <div key={env} className="pa-ff-env-row">
                <span className="pa-ff-env-row__name">{env}</span>
                <div className={`pa-ff-env-row__value ${!valueText ? 'pa-ff-env-row__value--empty' : ''}`}>
                  {valueText ?? (
                    <>
                      {t('platformAdmin.featureFlags.detail.notSet')}
                      <span className="pa-body-s"> — {t('platformAdmin.featureFlags.detail.clickToSet')}</span>
                    </>
                  )}
                </div>
                <div className="pa-ff-env-row__edit">
                  {(!envFlag || !envFlag.deletedAt) && (
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={() => openEditDefaultDialog(env)}
                    >
                      <span className="material-symbols-outlined">edit</span>
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        </Card>
      </div>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'overrides' | 'audit')}>
        <div className="pa-flex pa-flex-col sm:pa-flex-row pa-gap-2 pa-mb-4 pa-ff-tabs-bar">
          <TabsTrigger value="overrides">
            {t('platformAdmin.featureFlags.detail.overridesTab')} ({overrides.length})
          </TabsTrigger>
          <TabsTrigger value="audit">
            {t('platformAdmin.featureFlags.detail.auditLogTab')} ({auditLog.length})
          </TabsTrigger>
        </div>
        
        {/* Overrides Tab */}
        <TabsContent value="overrides">
          <div className="pa-flex pa-gap-2 pa-mb-4">
            <Button variant="primary" size="small" onClick={openAddOrgOverride} disabled={overrideEnvOptions.length === 0}>
              {t('platformAdmin.featureFlags.detail.addOrgOverride')}
            </Button>
            <Button variant="secondary" size="small" onClick={openAddUserOverride} disabled={overrideEnvOptions.length === 0}>
              {t('platformAdmin.featureFlags.detail.addUserOverride')}
            </Button>
          </div>
          <Card>
            <PlatformDataTable
              columns={overrideColumns as ColumnConfig<{ id: string }>[]}
              rows={overrides as ({ id: string })[]}
              loading={false}
              emptyMessage={t('platformAdmin.featureFlags.detail.noOverrides')}
              page={0}
              rowsPerPage={1000}
              totalCount={overrides.length}
              onPageChange={() => {}}
              onRowsPerPageChange={() => {}}
            />
          </Card>
        </TabsContent>
        
        {/* Audit Log Tab */}
        <TabsContent value="audit">
          <Card>
            <PlatformDataTable
              columns={auditColumns}
              rows={auditLog}
              loading={false}
              emptyMessage={t('platformAdmin.featureFlags.detail.noAuditLog')}
              page={0}
              rowsPerPage={1000}
              totalCount={auditLog.length}
              onPageChange={() => {}}
              onRowsPerPageChange={() => {}}
            />
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Edit Default Value Modal */}
      <Modal
        open={editingEnv !== null}
        onClose={() => {
          setEditingEnv(null)
          setEditError(null)
        }}
        title={`Edit Platform Default - ${editingEnv?.toUpperCase()}`}
        size="small"
      >
        <div className="pa-form-modal-body">
          {editError && (
            <div className="pa-form-error" role="alert">
              {editError}
            </div>
          )}

          {editingEnv && (flagsByEnv[editingEnv] || flag) && (
            <div className="pa-form-group">
              <label className="pa-form-modal-label">
                {t('platformAdmin.featureFlags.detail.valueLabel')} ({flagsByEnv[editingEnv]?.valueType ?? flag.valueType})
              </label>
              {(flagsByEnv[editingEnv]?.valueType ?? flag.valueType) === 'boolean' && (
                <div className="pa-form-row-inline">
                  <Switch
                    checked={editValue.boolean ?? false}
                    onCheckedChange={(checked) => setEditValue({ boolean: checked })}
                  />
                  <span className="pa-body-m">
                    {editValue.boolean ? 'true' : 'false'}
                  </span>
                </div>
              )}
              {(flagsByEnv[editingEnv]?.valueType ?? flag.valueType) === 'integer' && (
                <Input
                  type="number"
                  value={editValue.integer?.toString() ?? ''}
                  onChange={(e) => setEditValue({ integer: parseInt(e.target.value, 10) || 0 })}
                  placeholder="0"
                  className="pa-form-input-full"
                />
              )}
              {(flagsByEnv[editingEnv]?.valueType ?? flag.valueType) === 'double' && (
                <Input
                  type="number"
                  step="0.01"
                  value={editValue.double?.toString() ?? ''}
                  onChange={(e) => setEditValue({ double: parseFloat(e.target.value) || 0 })}
                  placeholder="0.0"
                  className="pa-form-input-full"
                />
              )}
            </div>
          )}

          <div className="pa-form-group">
            <label className="pa-form-modal-label">
              {t('platformAdmin.featureFlags.detail.reasonLabel')} *
            </label>
            <Input
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              placeholder={t('platformAdmin.featureFlags.detail.reasonPlaceholder')}
              className="pa-form-input-full"
            />
          </div>

          <div className="pa-form-modal-actions">
            <Button
              variant="ghost"
              onClick={() => {
                setEditingEnv(null)
                setEditError(null)
              }}
              disabled={editLoading}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveDefaultValue}
              disabled={editLoading || !editReason.trim()}
            >
              {editLoading ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add org override modal */}
      <Modal
        open={addOrgOverrideOpen}
        onClose={closeAddOrgOverride}
        title={t('platformAdmin.featureFlags.detail.addOrgOverrideTitle')}
        size="small"
      >
        <div className="pa-form-modal-body">
          {addOrgOverrideError && (
            <div className="pa-form-error" role="alert">
              {addOrgOverrideError}
            </div>
          )}
          <div className="pa-form-group">
            <label className="pa-form-modal-label">{t('platformAdmin.featureFlags.detail.environmentLabel')} *</label>
            <Select
              value={addOrgOverrideEnv ?? ''}
              onChange={(e) => setAddOrgOverrideEnv((e.target.value || null) as 'dev' | 'staging' | 'prod' | null)}
              options={[
                { value: '', label: t('common.select') || 'Select...' },
                ...overrideEnvOptions.map((env) => ({ value: env, label: env })),
              ]}
              disabled={addOrgOverrideLoading}
            />
          </div>
          <EntitySelect<{ logo_url?: string | null; city?: string | null; state?: string | null; zip?: string | null }>
            label={t('platformAdmin.featureFlags.detail.organization')}
            value={addOrgOverrideOrgId}
            onChange={(id) => setAddOrgOverrideOrgId(id)}
            fetchOptions={async (query) => {
              const { data, error } = await supabase
                .from('organizations')
                .select('id, name, logo_url, city, state, zip')
                .ilike('name', `%${query}%`)
                .limit(20)
              if (error) throw error
              return (data ?? []).map((org: { id: string; name: string; logo_url: string | null; city: string | null; state: string | null; zip: string | null }) => ({
                id: org.id,
                label: org.name,
                data: { logo_url: org.logo_url, city: org.city, state: org.state, zip: org.zip },
              }))
            }}
            getOptionById={async (id) => {
              const { data, error } = await supabase.from('organizations').select('id, name, logo_url, city, state, zip').eq('id', id).single()
              if (error || !data) return null
              return { id: data.id, label: data.name, data: { logo_url: data.logo_url, city: data.city, state: data.state, zip: data.zip } }
            }}
            renderOption={(option, isHighlighted) => {
              const locParts = [option.data?.city, option.data?.state].filter(Boolean) as string[]
              const location = locParts.length ? (option.data?.zip ? `${locParts.join(', ')} ${option.data.zip}` : locParts.join(', ')) : null
              return (
                <div
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    background: isHighlighted ? 'var(--pa-n50)' : 'transparent',
                    borderBottom: '1px solid var(--pa-n100)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                  }}
                >
                  {option.data?.logo_url && (
                    <img
                      src={option.data.logo_url}
                      alt=""
                      role="presentation"
                      style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'contain', flexShrink: 0, marginTop: 2 }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="pa-body-m">{option.label}</div>
                    {location && (
                      <div className="pa-body-s" style={{ color: 'var(--pa-n700)', marginTop: 2 }}>
                        {location}
                      </div>
                    )}
                    <div className="pa-body-s" style={{ color: 'var(--pa-n600)', marginTop: 2, fontFamily: 'monospace' }}>
                      {option.id}
                    </div>
                  </div>
                </div>
              )
            }}
            placeholder={t('platformAdmin.featureFlags.detail.searchOrganizationsPlaceholder')}
            disabled={addOrgOverrideLoading}
            required
          />
          {flag && (
            <div className="pa-form-group">
              <label className="pa-form-modal-label">{t('platformAdmin.featureFlags.detail.valueLabel')} ({flag.valueType}) *</label>
              {flag.valueType === 'boolean' && (
                <Select
                  value={addOrgOverrideValue.boolean !== undefined ? String(addOrgOverrideValue.boolean) : ''}
                  onChange={(e) => setAddOrgOverrideValue({ boolean: e.target.value === 'true' })}
                  options={[
                    { value: '', label: t('common.select') || 'Select...' },
                    { value: 'true', label: 'true' },
                    { value: 'false', label: 'false' },
                  ]}
                  disabled={addOrgOverrideLoading}
                />
              )}
              {flag.valueType === 'integer' && (
                <Input
                  type="number"
                  value={addOrgOverrideValue.integer?.toString() ?? ''}
                  onChange={(e) => setAddOrgOverrideValue({ integer: parseInt(e.target.value, 10) || 0 })}
                  placeholder="0"
                  className="pa-form-input-full"
                  disabled={addOrgOverrideLoading}
                />
              )}
              {flag.valueType === 'double' && (
                <Input
                  type="number"
                  step="any"
                  value={addOrgOverrideValue.double?.toString() ?? ''}
                  onChange={(e) => setAddOrgOverrideValue({ double: parseFloat(e.target.value) || 0 })}
                  placeholder="0.0"
                  className="pa-form-input-full"
                  disabled={addOrgOverrideLoading}
                />
              )}
            </div>
          )}
          <div className="pa-form-group">
            <label className="pa-form-modal-label">{t('platformAdmin.featureFlags.detail.reasonLabel')} *</label>
            <Input
              value={addOrgOverrideReason}
              onChange={(e) => setAddOrgOverrideReason(e.target.value)}
              placeholder={t('platformAdmin.featureFlags.detail.reasonPlaceholder')}
              className="pa-form-input-full"
              disabled={addOrgOverrideLoading}
            />
          </div>
          <div className="pa-form-modal-actions">
            <Button variant="ghost" onClick={closeAddOrgOverride} disabled={addOrgOverrideLoading}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleSetOrgOverride}
              disabled={
                addOrgOverrideLoading ||
                !addOrgOverrideEnv ||
                !addOrgOverrideOrgId ||
                !addOrgOverrideReason.trim() ||
                ((addOrgOverrideValue.boolean !== undefined ? 1 : 0) +
                  (addOrgOverrideValue.integer !== undefined ? 1 : 0) +
                  (addOrgOverrideValue.double !== undefined ? 1 : 0)) !== 1
              }
            >
              {addOrgOverrideLoading ? t('common.saving') : t('platformAdmin.featureFlags.detail.setOverride')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add user override modal */}
      <Modal
        open={addUserOverrideOpen}
        onClose={closeAddUserOverride}
        title={t('platformAdmin.featureFlags.detail.addUserOverrideTitle')}
        size="small"
      >
        <div className="pa-form-modal-body">
          {addUserOverrideError && (
            <div className="pa-form-error" role="alert">
              {addUserOverrideError}
            </div>
          )}
          <div className="pa-form-group">
            <label className="pa-form-modal-label">{t('platformAdmin.featureFlags.detail.environmentLabel')} *</label>
            <Select
              value={addUserOverrideEnv ?? ''}
              onChange={(e) => setAddUserOverrideEnv((e.target.value || null) as 'dev' | 'staging' | 'prod' | null)}
              options={[
                { value: '', label: t('common.select') || 'Select...' },
                ...overrideEnvOptions.map((env) => ({ value: env, label: env })),
              ]}
              disabled={addUserOverrideLoading}
            />
          </div>
          <EntitySelect<{ email?: string; display_name?: string }>
            label={t('platformAdmin.featureFlags.detail.user')}
            value={addUserOverrideUserId}
            onChange={(id) => setAddUserOverrideUserId(id)}
            fetchOptions={async (query) => {
              const { data, error } = await supabase
                .from('users')
                .select('id, email, display_name')
                .or(`email.ilike.%${query}%,display_name.ilike.%${query}%`)
                .limit(20)
              if (error) throw error
              return (data ?? []).map((u: { id: string; email: string | null; display_name: string | null }) => ({
                id: u.id,
                label: u.display_name || u.email || '',
                data: { email: u.email ?? undefined, display_name: u.display_name ?? undefined },
              }))
            }}
            getOptionById={async (id) => {
              const { data, error } = await supabase
                .from('users')
                .select('id, email, display_name')
                .eq('id', id)
                .single()
              if (error || !data) return null
              return { id: data.id, label: data.display_name || data.email || '' }
            }}
            renderOption={(option, isHighlighted) => (
              <div
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  background: isHighlighted ? 'var(--pa-n50)' : 'transparent',
                  borderBottom: '1px solid var(--pa-n100)',
                }}
              >
                <div className="pa-body-m">{option.label}</div>
                {option.data?.email && option.label !== option.data.email && (
                  <div className="pa-body-s" style={{ color: 'var(--pa-n700)' }}>
                    {option.data.email}
                  </div>
                )}
              </div>
            )}
            placeholder={t('platformAdmin.featureFlags.detail.searchUsersPlaceholder')}
            disabled={addUserOverrideLoading}
            required
          />
          {flag && (
            <div className="pa-form-group">
              <label className="pa-form-modal-label">{t('platformAdmin.featureFlags.detail.valueLabel')} ({flag.valueType}) *</label>
              {flag.valueType === 'boolean' && (
                <Select
                  value={addUserOverrideValue.boolean !== undefined ? String(addUserOverrideValue.boolean) : ''}
                  onChange={(e) => setAddUserOverrideValue({ boolean: e.target.value === 'true' })}
                  options={[
                    { value: '', label: t('common.select') || 'Select...' },
                    { value: 'true', label: 'true' },
                    { value: 'false', label: 'false' },
                  ]}
                  disabled={addUserOverrideLoading}
                />
              )}
              {flag.valueType === 'integer' && (
                <Input
                  type="number"
                  value={addUserOverrideValue.integer?.toString() ?? ''}
                  onChange={(e) => setAddUserOverrideValue({ integer: parseInt(e.target.value, 10) || 0 })}
                  placeholder="0"
                  className="pa-form-input-full"
                  disabled={addUserOverrideLoading}
                />
              )}
              {flag.valueType === 'double' && (
                <Input
                  type="number"
                  step="any"
                  value={addUserOverrideValue.double?.toString() ?? ''}
                  onChange={(e) => setAddUserOverrideValue({ double: parseFloat(e.target.value) || 0 })}
                  placeholder="0.0"
                  className="pa-form-input-full"
                  disabled={addUserOverrideLoading}
                />
              )}
            </div>
          )}
          <div className="pa-form-group">
            <label className="pa-form-modal-label">{t('platformAdmin.featureFlags.detail.reasonLabel')} *</label>
            <Input
              value={addUserOverrideReason}
              onChange={(e) => setAddUserOverrideReason(e.target.value)}
              placeholder={t('platformAdmin.featureFlags.detail.reasonPlaceholder')}
              className="pa-form-input-full"
              disabled={addUserOverrideLoading}
            />
          </div>
          <div className="pa-form-modal-actions">
            <Button variant="ghost" onClick={closeAddUserOverride} disabled={addUserOverrideLoading}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleSetUserOverride}
              disabled={
                addUserOverrideLoading ||
                !addUserOverrideEnv ||
                !addUserOverrideUserId ||
                !addUserOverrideReason.trim() ||
                ((addUserOverrideValue.boolean !== undefined ? 1 : 0) +
                  (addUserOverrideValue.integer !== undefined ? 1 : 0) +
                  (addUserOverrideValue.double !== undefined ? 1 : 0)) !== 1
              }
            >
              {addUserOverrideLoading ? t('common.saving') : t('platformAdmin.featureFlags.detail.setOverride')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit override modal */}
      <Modal
        open={overrideToEdit !== null}
        onClose={closeEditOverride}
        title={t('platformAdmin.featureFlags.detail.editOverrideTitle')}
        size="small"
      >
        <div className="pa-form-modal-body">
          {editOverrideError && (
            <div className="pa-form-error" role="alert">
              {editOverrideError}
            </div>
          )}
          {overrideToEdit && (
            <>
              <div className="pa-form-group">
                <label className="pa-form-modal-label">{overrideToEdit.overrideType === 'org' ? t('platformAdmin.featureFlags.detail.organization') : t('platformAdmin.featureFlags.detail.user')}</label>
                <div className="pa-body-m pa-flex pa-items-center pa-gap-2">
                  {overrideToEdit.overrideType === 'org' && orgLogoUrls[overrideToEdit.scopeId] && (
                    <img
                      src={orgLogoUrls[overrideToEdit.scopeId]}
                      alt=""
                      role="presentation"
                      style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'contain', flexShrink: 0 }}
                    />
                  )}
                  <span>{overrideToEdit.scopeName}</span>
                </div>
              </div>
              <div className="pa-form-group">
                <label className="pa-form-modal-label">{t('platformAdmin.featureFlags.detail.environmentLabel')}</label>
                <div className="pa-body-m">{overrideToEdit.environment}</div>
              </div>
              {flag && (
                <div className="pa-form-group">
                  <label className="pa-form-modal-label">{t('platformAdmin.featureFlags.detail.valueLabel')} ({flag.valueType}) *</label>
                  {flag.valueType === 'boolean' && (
                    <Select
                      value={editOverrideValue.boolean !== undefined ? String(editOverrideValue.boolean) : ''}
                      onChange={(e) => setEditOverrideValue({ boolean: e.target.value === 'true' })}
                      options={[
                        { value: '', label: t('common.select') || 'Select...' },
                        { value: 'true', label: 'true' },
                        { value: 'false', label: 'false' },
                      ]}
                      disabled={editOverrideLoading}
                    />
                  )}
                  {flag.valueType === 'integer' && (
                    <Input
                      type="number"
                      value={editOverrideValue.integer?.toString() ?? ''}
                      onChange={(e) => setEditOverrideValue({ integer: parseInt(e.target.value, 10) || 0 })}
                      placeholder="0"
                      className="pa-form-input-full"
                      disabled={editOverrideLoading}
                    />
                  )}
                  {flag.valueType === 'double' && (
                    <Input
                      type="number"
                      step="any"
                      value={editOverrideValue.double?.toString() ?? ''}
                      onChange={(e) => setEditOverrideValue({ double: parseFloat(e.target.value) || 0 })}
                      placeholder="0.0"
                      className="pa-form-input-full"
                      disabled={editOverrideLoading}
                    />
                  )}
                </div>
              )}
              <div className="pa-form-group">
                <label className="pa-form-modal-label">{t('platformAdmin.featureFlags.detail.reasonLabel')} *</label>
                <Input
                  value={editOverrideReason}
                  onChange={(e) => setEditOverrideReason(e.target.value)}
                  placeholder={t('platformAdmin.featureFlags.detail.reasonPlaceholder')}
                  className="pa-form-input-full"
                  disabled={editOverrideLoading}
                />
              </div>
              <div className="pa-form-modal-actions">
                <Button variant="ghost" onClick={closeEditOverride} disabled={editOverrideLoading}>
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveEditOverride}
                  disabled={
                    editOverrideLoading ||
                    !editOverrideReason.trim() ||
                    ((editOverrideValue.boolean !== undefined ? 1 : 0) +
                      (editOverrideValue.integer !== undefined ? 1 : 0) +
                      (editOverrideValue.double !== undefined ? 1 : 0)) !== 1
                  }
                >
                  {editOverrideLoading ? t('common.saving') : t('common.save')}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Remove override confirmation */}
      <ConfirmDialog
        open={overrideToRemove !== null}
        title={t('platformAdmin.featureFlags.detail.removeOverrideTitle')}
        description={
          overrideToRemove
            ? t('platformAdmin.featureFlags.detail.removeOverrideDescription', {
                type: overrideToRemove.overrideType === 'org' ? t('platformAdmin.featureFlags.detail.organization') : t('platformAdmin.featureFlags.detail.user'),
                scope: overrideToRemove.scopeName,
              })
            : ''
        }
        confirmLabel={t('platformAdmin.featureFlags.detail.removeOverride')}
        cancelLabel={t('common.cancel')}
        variant="warning"
        requireReason
        loading={removeOverrideLoading}
        error={removeOverrideError}
        onConfirm={handleRemoveOverride}
        onCancel={() => {
          setOverrideToRemove(null)
          setRemoveOverrideError(null)
        }}
      />
    </div>
  )
}
