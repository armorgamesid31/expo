import { useState } from 'react';
import { ArrowLeft, Plus, Trash2, ShieldBan, Phone, Calendar, Search, AlertTriangle, X, User, Settings, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { customers } from '../../data/mockData';

interface BlacklistProps {
  onBack: () => void;
}

interface BlacklistEntry {
  id: string;
  name: string;
  phone: string;
  reason: string;
  date: string;
  noShowCount?: number;
}

interface BlacklistSettings {
  autoBlock: boolean;
  noShowThreshold: number;
  blockOnlineBooking: boolean;
  showWarningOnManual: boolean;
  notifyStaff: boolean;
}

const initialBlacklist: BlacklistEntry[] = [
  {
    id: 'bl1',
    name: 'Deniz Aktas',
    phone: '+90 538 111 2233',
    reason: 'He missed the appointment 4 times in a row. Cannot be reached by phone.',
    date: '2026-01-15',
    noShowCount: 4,
  },
  {
    id: 'bl2',
    name: 'Gizem Polat',
    phone: '+90 539 222 3344',
    reason: 'Rude behavior towards employees. Failure to comply with salon rules.',
    date: '2026-02-03',
    noShowCount: 1,
  },
  {
    id: 'bl3',
    name: 'Cem Yildiz',
    phone: '+90 540 333 4455',
    reason: 'He left the hall without paying. Does not respond to payment requests.',
    date: '2025-12-20',
    noShowCount: 2,
  },
];

export function Blacklist({ onBack }: BlacklistProps) {
  const [entries, setEntries] = useState<BlacklistEntry[]>(initialBlacklist);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<Partial<BlacklistEntry>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'settings'>('list');
  const [nameInput, setNameInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [settings, setSettings] = useState<BlacklistSettings>({
    autoBlock: false,
    noShowThreshold: 3,
    blockOnlineBooking: true,
    showWarningOnManual: true,
    notifyStaff: true,
  });

  const filteredEntries = entries.filter(e =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.phone.includes(searchQuery)
  );

  // Filter customers for suggestions
  const customerSuggestions = customers.filter(c => 
    c.name.toLowerCase().includes(nameInput.toLowerCase()) && 
    nameInput.length > 0 &&
    !entries.some(e => e.phone === c.phone)
  ).slice(0, 5);

  const handleAdd = () => {
    if (!formData.name || !formData.phone || !formData.reason) return;

    const newEntry: BlacklistEntry = {
      id: `bl${Date.now()}`,
      name: formData.name,
      phone: formData.phone,
      reason: formData.reason,
      date: new Date().toISOString().split('T')[0],
      noShowCount: formData.noShowCount || 0,
    };

    setEntries([newEntry, ...entries]);
    setIsDialogOpen(false);
    setFormData({});
    setNameInput('');
    setShowSuggestions(false);
  };

  const handleRemove = (id: string) => {
    setEntries(entries.filter(e => e.id !== id));
    setConfirmDelete(null);
  };

  const handleSelectCustomer = (customer: typeof customers[0]) => {
    setFormData({
      ...formData,
      name: customer.name,
      phone: customer.phone,
      noShowCount: customer.noShowCount,
    });
    setNameInput(customer.name);
    setShowSuggestions(false);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="h-full pb-20 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-border bg-[var(--luxury-bg)] sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">Blacklist</h1>
            <p className="text-sm text-muted-foreground">Blocked customers and settings</p>
          </div>
          {activeTab === 'list' && (
            <Button
              onClick={() => {
                setFormData({});
                setNameInput('');
                setIsDialogOpen(true);
              }}
              style={{ backgroundColor: 'var(--rose-gold)', color: 'white' }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'list'
                ? 'bg-[var(--rose-gold)] text-white'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            <ShieldBan className="w-4 h-4 inline mr-2" />
            Blacklist
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'settings'
                ? 'bg-[var(--rose-gold)] text-white'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            <Settings className="w-4 h-4 inline mr-2" />
            Settings
          </button>
        </div>

        {/* Search - only visible on list tab */}
        {activeTab === 'list' && (
          <div className="relative mt-3">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or phone..."
              className="pl-10"
            />
          </div>
        )}
      </div>

      {activeTab === 'list' ? (
        <div className="p-4 space-y-3">
          {/* Info Banner */}
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-3 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-amber-800 dark:text-amber-400">
                  People in the blacklist see a warning during online booking and automatic appointment creation is blocked. A warning is also shown during manual booking.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-border/50">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-red-500">{entries.length}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Toplam</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-amber-500">
                  {entries.filter(e => (e.noShowCount || 0) >= 3).length}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">No-Show</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-[var(--deep-indigo)]">
                  {entries.filter(e => {
                    const d = new Date(e.date);
                    const now = new Date();
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                  }).length}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">This Month</p>
              </CardContent>
            </Card>
          </div>

          {/* Entries List */}
          {filteredEntries.map((entry) => (
            <Card key={entry.id} className="border-border/50 border-l-4 border-l-red-400">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                    <ShieldBan className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-foreground">{entry.name}</h3>
                      {confirmDelete === entry.id ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-red-600"
                            onClick={() => handleRemove(entry.id)}
                          >
                            Onayla
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setConfirmDelete(null)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setConfirmDelete(entry.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {entry.phone}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(entry.date)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{entry.reason}</p>
                    {(entry.noShowCount || 0) > 0 && (
                      <Badge variant="secondary" className="mt-2 text-[10px] bg-red-500/10 text-red-600">
                        {entry.noShowCount} times missed
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredEntries.length === 0 && (
            <Card className="border-border/50">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-green-500/10">
                  <User className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-muted-foreground text-sm">
                  {searchQuery ? 'No records matching your search were found' : 'No one is blacklisted'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        /* Settings Tab */
        <div className="p-4 space-y-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-sm">Automatic Blocking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label className="text-sm font-medium">Automatic Blacklist</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Automatically block customers reaching the specified no-show count
                  </p>
                </div>
                <Switch
                  checked={settings.autoBlock}
                  onCheckedChange={(checked) => setSettings({ ...settings, autoBlock: checked })}
                />
              </div>

              {settings.autoBlock && (
                <div className="space-y-2 pl-4 border-l-2 border-muted">
                  <Label className="text-xs">No-Show Threshold</Label>
                  <select
                    value={settings.noShowThreshold}
                    onChange={(e) => setSettings({ ...settings, noShowThreshold: parseInt(e.target.value) })}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                  >
                    <option value="2">2 times</option>
                    <option value="3">3 times</option>
                    <option value="4">4 times</option>
                    <option value="5">5 times</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Customer is automatically blacklisted after this many no-shows
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-sm">Appointment Restrictions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label className="text-sm font-medium">Block Online Appointments</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Blacklisted customers cannot book online appointments
                  </p>
                </div>
                <Switch
                  checked={settings.blockOnlineBooking}
                  onCheckedChange={(checked) => setSettings({ ...settings, blockOnlineBooking: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label className="text-sm font-medium">Manual Appointment Warning</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Show warning during staff appointment entry
                  </p>
                </div>
                <Switch
                  checked={settings.showWarningOnManual}
                  onCheckedChange={(checked) => setSettings({ ...settings, showWarningOnManual: checked })}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-sm">Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label className="text-sm font-medium">Notify Staff</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Notify all staff when a new blacklist entry is added
                  </p>
                </div>
                <Switch
                  checked={settings.notifyStaff}
                  onCheckedChange={(checked) => setSettings({ ...settings, notifyStaff: checked })}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="p-4 flex items-center gap-2 text-sm text-green-700">
              <Check className="w-4 h-4" />
              Settings are saved automatically
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Blacklistye Add</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2 relative">
              <Label htmlFor="bl-name">Ad Soyad *</Label>
              <Input
                id="bl-name"
                value={nameInput}
                onChange={(e) => {
                  setNameInput(e.target.value);
                  setFormData({ ...formData, name: e.target.value });
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Customer name"
              />
              
              {/* Customer Suggestions */}
              {showSuggestions && customerSuggestions.length > 0 && (
                <Card className="absolute z-20 w-full mt-1 border-border/50 shadow-lg">
                  <CardContent className="p-2">
                    {customerSuggestions.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => handleSelectCustomer(customer)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors text-left"
                      >
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{customer.name}</p>
                          <p className="text-xs text-muted-foreground">{customer.phone}</p>
                        </div>
                        {customer.noShowCount > 0 && (
                          <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600">
                            {customer.noShowCount} no-show
                          </Badge>
                        )}
                      </button>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bl-phone">Phone *</Label>
              <Input
                id="bl-phone"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+90 5XX XXX XXXX"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bl-noshow">No-show Count</Label>
              <Input
                id="bl-noshow"
                type="number"
                value={formData.noShowCount || ''}
                onChange={(e) => setFormData({ ...formData, noShowCount: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bl-reason">Engelleme Sebebi *</Label>
              <textarea
                id="bl-reason"
                value={formData.reason || ''}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={3}
                placeholder="Explain the reason for blocking..."
                className="w-full bg-transparent rounded-lg px-3 py-2 text-sm outline-none border border-input focus:ring-2 focus:ring-[var(--rose-gold)]/30 resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsDialogOpen(false);
              setNameInput('');
              setShowSuggestions(false);
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!formData.name || !formData.phone || !formData.reason}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Blacklistye Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
