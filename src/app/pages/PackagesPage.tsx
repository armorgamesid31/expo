import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { PackageTemplateItem } from '../types/mobile-api';

interface ServiceItem {
  id: number;
  name: string;
}

interface TemplateFormService {
  serviceId: string;
  initialQuota: string;
}

const EMPTY_FORM_SERVICE: TemplateFormService = { serviceId: '', initialQuota: '8' };

export function PackagesPage() {
  const { apiFetch } = useAuth();

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [templates, setTemplates] = useState<PackageTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [scopeType, setScopeType] = useState<'SINGLE_SERVICE' | 'POOL'>('SINGLE_SERVICE');
  const [price, setPrice] = useState('');
  const [validityDays, setValidityDays] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [rows, setRows] = useState<TemplateFormService[]>([{ ...EMPTY_FORM_SERVICE }]);

  const serviceOptions = useMemo(
    () => services.map((service) => ({ label: service.name, value: String(service.id) })),
    [services],
  );

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setScopeType('SINGLE_SERVICE');
    setPrice('');
    setValidityDays('');
    setNotes('');
    setIsActive(true);
    setRows([{ ...EMPTY_FORM_SERVICE }]);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [servicesResponse, templatesResponse] = await Promise.all([
        apiFetch<{ items: ServiceItem[] }>('/api/admin/services'),
        apiFetch<{ items: PackageTemplateItem[] }>('/api/admin/package-templates'),
      ]);
      setServices(servicesResponse.items || []);
      setTemplates(templatesResponse.items || []);
    } catch (err: any) {
      setError(err?.message || 'Package templates could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const addRow = () => {
    setRows((prev) => [...prev, { ...EMPTY_FORM_SERVICE }]);
  };

  const removeRow = (index: number) => {
    setRows((prev) => {
      if (prev.length <= 1) {
        return prev;
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const setRowValue = (index: number, patch: Partial<TemplateFormService>) => {
    setRows((prev) => prev.map((row, idx) => (idx === index ? { ...row, ...patch } : row)));
  };

  const hydrateFormFromTemplate = (item: PackageTemplateItem) => {
    setEditingId(item.id);
    setName(item.name || '');
    setScopeType(item.scopeType || 'SINGLE_SERVICE');
    setPrice(item.price === null || item.price === undefined ? '' : String(item.price));
    setValidityDays(item.validityDays === null || item.validityDays === undefined ? '' : String(item.validityDays));
    setNotes(item.notes || '');
    setIsActive(Boolean(item.isActive));
    setRows(
      item.services.length
        ? item.services.map((row) => ({
            serviceId: String(row.serviceId),
            initialQuota: String(row.initialQuota),
          }))
        : [{ ...EMPTY_FORM_SERVICE }],
    );
  };

  const submitTemplate = async () => {
    const normalizedName = name.trim();
    if (!normalizedName) {
      setError('Template name is required.');
      return;
    }

    const payloadServices = rows
      .map((row) => ({
        serviceId: Number(row.serviceId),
        initialQuota: Number(row.initialQuota),
      }))
      .filter(
        (row) =>
          Number.isInteger(row.serviceId) &&
          row.serviceId > 0 &&
          Number.isInteger(row.initialQuota) &&
          row.initialQuota > 0,
      );

    const uniqueServiceIds = new Set(payloadServices.map((row) => row.serviceId));
    if (!payloadServices.length || payloadServices.length !== uniqueServiceIds.size) {
      setError('Add at least one valid service and avoid duplicate services.');
      return;
    }

    if (validityDays && (!Number.isInteger(Number(validityDays)) || Number(validityDays) <= 0)) {
      setError('Validity days must be a positive integer.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        name: normalizedName,
        scopeType,
        services: payloadServices,
        isActive,
        price: price.trim() ? Number(price) : null,
        validityDays: validityDays.trim() ? Number(validityDays) : null,
        notes: notes.trim() || null,
      };

      if (editingId) {
        await apiFetch<{ item: PackageTemplateItem }>(`/api/admin/package-templates/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setSuccess('Template updated.');
      } else {
        await apiFetch<{ item: PackageTemplateItem }>('/api/admin/package-templates', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setSuccess('Template created.');
      }

      resetForm();
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Template could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Package Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Define service-based package templates (quota per service).</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">{editingId ? 'Edit Template' : 'New Template'}</p>
          {editingId ? (
            <button type="button" className="rounded-md border border-border px-3 py-1.5 text-xs" onClick={resetForm}>
              Cancel Edit
            </button>
          ) : null}
        </div>

        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-md border border-border px-3 py-2 text-sm"
          placeholder="Template name"
        />

        <div className="grid grid-cols-2 gap-2">
          <select
            value={scopeType}
            onChange={(event) => setScopeType(event.target.value === 'POOL' ? 'POOL' : 'SINGLE_SERVICE')}
            className="h-10 rounded-md border border-border px-3 text-sm bg-background"
          >
            <option value="SINGLE_SERVICE">Single Service</option>
            <option value="POOL">Pool</option>
          </select>
          <select
            value={isActive ? '1' : '0'}
            onChange={(event) => setIsActive(event.target.value === '1')}
            className="h-10 rounded-md border border-border px-3 text-sm bg-background"
          >
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input
            value={price}
            type="number"
            min="0"
            step="0.01"
            onChange={(event) => setPrice(event.target.value)}
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
            placeholder="Price (optional)"
          />
          <input
            value={validityDays}
            type="number"
            min="1"
            step="1"
            onChange={(event) => setValidityDays(event.target.value)}
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
            placeholder="Validity days"
          />
        </div>

        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="w-full rounded-md border border-border px-3 py-2 text-sm min-h-[80px]"
          placeholder="Notes (optional)"
        />

        <div className="space-y-2 rounded-md border border-border p-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium">Services and Initial Quotas</p>
            <button type="button" onClick={addRow} className="rounded-md border border-border px-2 py-1 text-xs">
              Add Service
            </button>
          </div>

          {rows.map((row, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_110px_70px] gap-2">
              <select
                value={row.serviceId}
                onChange={(event) => setRowValue(idx, { serviceId: event.target.value })}
                className="h-10 rounded-md border border-border px-2 text-sm bg-background"
              >
                <option value="">Select service</option>
                {serviceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <input
                value={row.initialQuota}
                onChange={(event) => setRowValue(idx, { initialQuota: event.target.value })}
                type="number"
                min="1"
                step="1"
                className="h-10 rounded-md border border-border px-2 text-sm"
                placeholder="Quota"
              />

              <button
                type="button"
                onClick={() => removeRow(idx)}
                className="h-10 rounded-md border border-border text-xs"
                disabled={rows.length <= 1}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

        <button
          type="button"
          onClick={() => void submitTemplate()}
          disabled={saving}
          className="w-full rounded-md bg-[var(--rose-gold)] text-white px-4 py-2 text-sm disabled:opacity-60"
        >
          {saving ? 'Saving...' : editingId ? 'Update Template' : 'Create Template'}
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card p-3 space-y-2">
        <p className="text-sm font-semibold">Existing Templates</p>
        {loading ? <p className="text-sm text-muted-foreground">Loading templates...</p> : null}
        {!loading && templates.length === 0 ? <p className="text-sm text-muted-foreground">No templates yet.</p> : null}

        {templates.map((template) => (
          <div key={template.id} className="rounded-lg border border-border p-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-sm">{template.name}</p>
              <button
                type="button"
                className="rounded-md border border-border px-2 py-1 text-xs"
                onClick={() => hydrateFormFromTemplate(template)}
              >
                Edit
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {template.isActive ? 'Active' : 'Inactive'} • {template.scopeType} •{' '}
              {template.validityDays ? `${template.validityDays} days` : 'No expiry'}
            </p>
            <div className="flex flex-wrap gap-1">
              {template.services.map((service) => (
                <span key={service.id} className="text-[11px] rounded-full border border-border px-2 py-0.5">
                  {service.service?.name || `#${service.serviceId}`}: {service.initialQuota}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
