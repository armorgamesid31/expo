import { useState } from 'react';
import { ArrowLeft, UserPlus, Award, ChevronDown, ChevronUp, BarChart2, Plus, Settings as SettingsIcon, TrendingUp, Users, Gift, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';

interface CampaignsProps {
  onBack: () => void;
}

interface ReferralCampaign {
  id: string;
  name: string;
  active: boolean;
  referrerReward: string;
  refereeReward: string;
  minSpend?: number;
  expiryDays: number;
  totalReferrals: number;
  successfulReferrals: number;
  revenue: number;
}

interface LoyaltyCampaign {
  id: string;
  name: string;
  active: boolean;
  pointsPerLira: number;
  pointsForReward: number;
  rewardType: string;
  rewardValue: string;
  memberCount: number;
  totalPointsIssued: number;
  rewardsRedeemed: number;
}

const mockReferralCampaigns: ReferralCampaign[] = [
{
  id: 'ref1',
  name: "Arkadaşını Getir Kampanyası",
  active: true,
  referrerReward: '₺50 indirim',
  refereeReward: '₺30 indirim',
  minSpend: 200,
  expiryDays: 30,
  totalReferrals: 24,
  successfulReferrals: 18,
  revenue: 5400
}];


const mockLoyaltyCampaigns: LoyaltyCampaign[] = [
{
  id: 'loy1',
  name: 'VIP Loyalty Program',
  active: true,
  pointsPerLira: 1,
  pointsForReward: 500,
  rewardType: 'discount',
  rewardValue: '₺100 indirim',
  memberCount: 67,
  totalPointsIssued: 12450,
  rewardsRedeemed: 8
}];


const referralMetrics = [
{ month: 'Oca', referrals: 5, conversions: 3 },
{ month: 'feb', referrals: 8, conversions: 6 },
{ month: 'Mar', referrals: 11, conversions: 9 }];


const loyaltyMetrics = [
{ month: 'Oca', points: 3200, redeemed: 2 },
{ month: 'feb', points: 4100, redeemed: 3 },
{ month: 'Mar', points: 5150, redeemed: 3 }];


export function Campaigns({ onBack }: CampaignsProps) {
  const [activeTab, setActiveTab] = useState<'referral' | 'loyalty'>('referral');
  const [referralCampaigns, setReferralCampaigns] = useState(mockReferralCampaigns);
  const [loyaltyCampaigns, setLoyaltyCampaigns] = useState(mockLoyaltyCampaigns);
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [showNewCampaign, setShowNewCampaign] = useState(false);

  // Referral form state
  const [referralForm, setReferralForm] = useState({
    name: '',
    referrerReward: '',
    refereeReward: '',
    minSpend: '',
    expiryDays: '30'
  });

  // Loyalty form state
  const [loyaltyForm, setLoyaltyForm] = useState({
    name: '',
    pointsPerLira: '1',
    pointsForReward: '',
    rewardValue: ''
  });

  const handleCreateReferral = () => {
    const newCampaign: ReferralCampaign = {
      id: `ref${Date.now()}`,
      name: referralForm.name,
      active: true,
      referrerReward: referralForm.referrerReward,
      refereeReward: referralForm.refereeReward,
      minSpend: parseInt(referralForm.minSpend) || undefined,
      expiryDays: parseInt(referralForm.expiryDays),
      totalReferrals: 0,
      successfulReferrals: 0,
      revenue: 0
    };

    setReferralCampaigns([...referralCampaigns, newCampaign]);
    setShowNewCampaign(false);
    setReferralForm({
      name: '',
      referrerReward: '',
      refereeReward: '',
      minSpend: '',
      expiryDays: '30'
    });
  };

  const handleCreateLoyalty = () => {
    const newCampaign: LoyaltyCampaign = {
      id: `loy${Date.now()}`,
      name: loyaltyForm.name,
      active: true,
      pointsPerLira: parseFloat(loyaltyForm.pointsPerLira),
      pointsForReward: parseInt(loyaltyForm.pointsForReward),
      rewardType: 'discount',
      rewardValue: loyaltyForm.rewardValue,
      memberCount: 0,
      totalPointsIssued: 0,
      rewardsRedeemed: 0
    };

    setLoyaltyCampaigns([...loyaltyCampaigns, newCampaign]);
    setShowNewCampaign(false);
    setLoyaltyForm({
      name: '',
      pointsPerLira: '1',
      pointsForReward: '',
      rewardValue: ''
    });
  };

  const toggleCampaignActive = (id: string, type: 'referral' | 'loyalty') => {
    if (type === 'referral') {
      setReferralCampaigns(referralCampaigns.map((c) =>
      c.id === id ? { ...c, active: !c.active } : c
      ));
    } else {
      setLoyaltyCampaigns(loyaltyCampaigns.map((c) =>
      c.id === id ? { ...c, active: !c.active } : c
      ));
    }
  };

  return (
    <div className="h-full pb-20 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-[var(--luxury-bg)] z-10 border-b border-border p-4">
        <div className="flex items-center gap-3 mb-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">Campaigns</h1>
            <p className="text-sm text-muted-foreground">Loyalty and referral programs</p>
          </div>
          <Button
            onClick={() => setShowNewCampaign(!showNewCampaign)}
            style={{ backgroundColor: 'var(--rose-gold)', color: 'white' }}>
            
            <Plus className="w-4 h-4 mr-1" />
            New
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('referral')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'referral' ?
            'bg-gradient-to-r from-[var(--rose-gold)] to-[var(--rose-gold-dark)] text-white shadow-md' :
            'bg-muted text-muted-foreground'}`
            }>
            
            <UserPlus className="w-4 h-4 inline mr-2" />
            Referral
          </button>
          <button
            onClick={() => setActiveTab('loyalty')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'loyalty' ?
            'bg-gradient-to-r from-[var(--rose-gold)] to-[var(--rose-gold-dark)] text-white shadow-md' :
            'bg-muted text-muted-foreground'}`
            }>
            
            <Award className="w-4 h-4 inline mr-2" />
            Loyalty Program
          </button>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* New Campaign Form */}
        {showNewCampaign &&
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}>
          
            <Card className="border-[var(--rose-gold)]/30 bg-[var(--rose-gold)]/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <SettingsIcon className="w-4 h-4 text-[var(--rose-gold)]" />
                  New {activeTab === 'referral' ? 'Invite a Friend' : 'Sadakat'} Campaign
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeTab === 'referral' ?
              <>
                    <div className="space-y-2">
                      <Label htmlFor="ref-name">Kampanya Adı *</Label>
                      <Input
                    id="ref-name"
                    value={referralForm.name}
                    onChange={(e) => setReferralForm({ ...referralForm, name: e.target.value })}
                    placeholder="Ex: Bahar Bring a Friend" />
                  
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="ref-reward">Referrer Reward</Label>
                        <Input
                      id="ref-reward"
                      value={referralForm.referrerReward}
                      onChange={(e) => setReferralForm({ ...referralForm, referrerReward: e.target.value })}
                      placeholder="₺50 indirim" />
                    
                        <p className="text-xs text-muted-foreground">For the referrer</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ref-new">Win Yeni Müşteris</Label>
                        <Input
                      id="ref-new"
                      value={referralForm.refereeReward}
                      onChange={(e) => setReferralForm({ ...referralForm, refereeReward: e.target.value })}
                      placeholder="₺30 indirim" />
                    
                        <p className="text-xs text-muted-foreground">For the invited customer</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="ref-min">Minimum Harcama</Label>
                        <Input
                      id="ref-min"
                      type="number"
                      value={referralForm.minSpend}
                      onChange={(e) => setReferralForm({ ...referralForm, minSpend: e.target.value })}
                      placeholder="200" />
                    
                        <p className="text-xs text-muted-foreground">Required amount for reward (₺)</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ref-expiry">Validity Period</Label>
                        <select
                      id="ref-expiry"
                      value={referralForm.expiryDays}
                      onChange={(e) => setReferralForm({ ...referralForm, expiryDays: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                      
                          <option value="7">7 days</option>
                          <option value="14">14 days</option>
                          <option value="30">30 days</option>
                          <option value="60">60 days</option>
                          <option value="90">90 days</option>
                        </select>
                      </div>
                    </div>

                    <Button
                  onClick={handleCreateReferral}
                  disabled={!referralForm.name || !referralForm.referrerReward || !referralForm.refereeReward}
                  className="w-full bg-[var(--rose-gold)] hover:bg-[var(--rose-gold-dark)] text-white">
                  
                      Kampanya Oluştur
                    </Button>
                  </> :

              <>
                    <div className="space-y-2">
                      <Label htmlFor="loy-name">Program Name *</Label>
                      <Input
                    id="loy-name"
                    value={loyaltyForm.name}
                    onChange={(e) => setLoyaltyForm({ ...loyaltyForm, name: e.target.value })}
                    placeholder="Ex: VIP Loyalty Program" />
                  
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="loy-rate">Point Rate</Label>
                        <select
                      id="loy-rate"
                      value={loyaltyForm.pointsPerLira}
                      onChange={(e) => setLoyaltyForm({ ...loyaltyForm, pointsPerLira: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                      
                          <option value="0.5">Her ₺2'de 1 puan</option>
                          <option value="1">Her ₺1'de 1 puan</option>
                          <option value="2">Her ₺1'de 2 puan</option>
                          <option value="5">Her ₺1'de 5 puan</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="loy-threshold">Points Required for Reward</Label>
                        <Input
                      id="loy-threshold"
                      type="number"
                      value={loyaltyForm.pointsForReward}
                      onChange={(e) => setLoyaltyForm({ ...loyaltyForm, pointsForReward: e.target.value })}
                      placeholder="500" />
                    
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="loy-reward">Reward</Label>
                      <Input
                    id="loy-reward"
                    value={loyaltyForm.rewardValue}
                    onChange={(e) => setLoyaltyForm({ ...loyaltyForm, rewardValue: e.target.value })}
                    placeholder="₺100 off or Free manicure" />
                  
                      <p className="text-xs text-muted-foreground">
                        Reward earned when customer reaches required points
                      </p>
                    </div>

                    <Button
                  onClick={handleCreateLoyalty}
                  disabled={!loyaltyForm.name || !loyaltyForm.pointsForReward || !loyaltyForm.rewardValue}
                  className="w-full bg-[var(--rose-gold)] hover:bg-[var(--rose-gold-dark)] text-white">
                  
                      Program Oluştur
                    </Button>
                  </>
              }
              </CardContent>
            </Card>
          </motion.div>
        }

        {/* Referral Campaigns */}
        {activeTab === 'referral' &&
        <>
            {/* Stats */}
            <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-3 gap-3">
            
              <Card className="border-border/50">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-[var(--rose-gold)]">
                    {referralCampaigns.reduce((sum, c) => sum + c.totalReferrals, 0)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Toplam Tavsiye</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {referralCampaigns.reduce((sum, c) => sum + c.successfulReferrals, 0)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Successful</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-[var(--deep-indigo)]">
                    ₺{referralCampaigns.reduce((sum, c) => sum + c.revenue, 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Gelir</p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Performance Chart */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}>
              <h2 className="font-semibold mb-3 px-1">Referral Performance</h2>
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-[var(--rose-gold)]" />
                    Son 3 Ay
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={referralMetrics} barSize={16}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                      <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                      <Tooltip
                      contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 12 }} />
                    
                      <Bar key="referrals-bar" dataKey="referrals" name="Tavsiyeler" fill="var(--rose-gold)" opacity={0.6} radius={[4, 4, 0, 0]} />
                      <Bar key="conversions-bar" dataKey="conversions" name="Transformers" fill="#22C55E" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex items-center gap-4 justify-center mt-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm bg-[var(--rose-gold)]/60" />
                      <span className="text-[10px] text-muted-foreground">Tavsiyeler</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm bg-green-500" />
                      <span className="text-[10px] text-muted-foreground">Converted</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Active Campaigns */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
              <h2 className="font-semibold mb-3 px-1">Aktif Campaigns</h2>
              <div className="space-y-2">
                {referralCampaigns.map((campaign) =>
              <Card key={campaign.id} className={`border-border/50 ${campaign.active ? 'border-l-4 border-l-green-500' : 'opacity-60'}`}>
                    <CardContent className="p-4">
                      <button
                    className="w-full text-left"
                    onClick={() => setExpandedCampaign(expandedCampaign === campaign.id ? null : campaign.id)}>
                    
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{campaign.name}</h3>
                            <Badge variant={campaign.active ? 'default' : 'secondary'} className="text-[10px]">
                              {campaign.active ? 'Aktif' : 'Pasif'}
                            </Badge>
                          </div>
                          {expandedCampaign === campaign.id ?
                      <ChevronUp className="w-4 h-4 text-muted-foreground" /> :

                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      }
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1">
                            <UserPlus className="w-3 h-3 text-[var(--rose-gold)]" />
                            <span className="text-muted-foreground">{campaign.totalReferrals} tavsiye</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-green-600" />
                            <span className="text-muted-foreground">{campaign.successfulReferrals} conversions</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Gift className="w-3 h-3 text-[var(--deep-indigo)]" />
                            <span className="text-muted-foreground">₺{campaign.revenue.toLocaleString()} gelir</span>
                          </div>
                        </div>
                      </button>

                      {expandedCampaign === campaign.id &&
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.25 }}
                    className="mt-4 pt-4 border-t border-border space-y-4">
                    
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                              <p className="text-xs text-muted-foreground mb-1">Referrer Reward</p>
                              <p className="font-semibold text-green-700">{campaign.referrerReward}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                              <p className="text-xs text-muted-foreground mb-1">Win Yeni Müşteris</p>
                              <p className="font-semibold text-blue-700">{campaign.refereeReward}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <p className="text-muted-foreground mb-1">Min. Harcama</p>
                              <p className="font-medium">{campaign.minSpend ? `₺${campaign.minSpend}` : 'Yok'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-1">Validity</p>
                              <p className="font-medium">{campaign.expiryDays} days</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-1">Success Rate</p>
                              <p className="font-medium text-green-600">
                                %{campaign.totalReferrals > 0 ? Math.round(campaign.successfulReferrals / campaign.totalReferrals * 100) : 0}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-1">Revenue per Person</p>
                              <p className="font-medium text-[var(--deep-indigo)]">
                                ₺{campaign.successfulReferrals > 0 ? Math.round(campaign.revenue / campaign.successfulReferrals) : 0}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2">
                            <Label className="text-sm">Kampanya Durumu</Label>
                            <Switch
                        checked={campaign.active}
                        onCheckedChange={() => toggleCampaignActive(campaign.id, 'referral')} />
                      
                          </div>
                        </motion.div>
                  }
                    </CardContent>
                  </Card>
              )}

                {referralCampaigns.length === 0 &&
              <Card className="border-border/50">
                    <CardContent className="p-12 text-center">
                      <UserPlus className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                      <p className="text-sm text-muted-foreground">
                        You have not created a referral campaign yet
                      </p>
                    </CardContent>
                  </Card>
              }
              </div>
            </motion.div>
          </>
        }

        {/* Loyalty Programs */}
        {activeTab === 'loyalty' &&
        <>
            {/* Stats */}
            <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-3 gap-3">
            
              <Card className="border-border/50">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-[var(--rose-gold)]">
                    {loyaltyCampaigns.reduce((sum, c) => sum + c.memberCount, 0)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Member Count</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-amber-600">
                    {loyaltyCampaigns.reduce((sum, c) => sum + c.totalPointsIssued, 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Toplam Puan</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {loyaltyCampaigns.reduce((sum, c) => sum + c.rewardsRedeemed, 0)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Redeemed Reward</p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Performance Chart */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}>
              <h2 className="font-semibold mb-3 px-1">Points Performance</h2>
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[var(--rose-gold)]" />
                    Son 3 Ay
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={loyaltyMetrics}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                      <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                      <Tooltip
                      contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 12 }} />
                    
                      <Line key="points-line" type="monotone" dataKey="points" name="Verilen Puan" stroke="var(--rose-gold)" strokeWidth={2} dot={{ r: 4 }} />
                      <Line key="redeemed-line" type="monotone" dataKey="redeemed" name="used" stroke="#22C55E" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="flex items-center gap-4 justify-center mt-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-[var(--rose-gold)]" />
                      <span className="text-[10px] text-muted-foreground">Verilen Puan</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-[10px] text-muted-foreground">Redeemed</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Active Programs */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
              <h2 className="font-semibold mb-3 px-1">Aktif Programlar</h2>
              <div className="space-y-2">
                {loyaltyCampaigns.map((program) =>
              <Card key={program.id} className={`border-border/50 ${program.active ? 'border-l-4 border-l-amber-500' : 'opacity-60'}`}>
                    <CardContent className="p-4">
                      <button
                    className="w-full text-left"
                    onClick={() => setExpandedCampaign(expandedCampaign === program.id ? null : program.id)}>
                    
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{program.name}</h3>
                            <Badge variant={program.active ? 'default' : 'secondary'} className="text-[10px]">
                              {program.active ? 'Aktif' : 'Pasif'}
                            </Badge>
                          </div>
                          {expandedCampaign === program.id ?
                      <ChevronUp className="w-4 h-4 text-muted-foreground" /> :

                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      }
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-[var(--rose-gold)]" />
                            <span className="text-muted-foreground">{program.memberCount} members</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Award className="w-3 h-3 text-amber-600" />
                            <span className="text-muted-foreground">{program.totalPointsIssued.toLocaleString()} puan</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Gift className="w-3 h-3 text-green-600" />
                            <span className="text-muted-foreground">{program.rewardsRedeemed} rewards</span>
                          </div>
                        </div>
                      </button>

                      {expandedCampaign === program.id &&
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.25 }}
                    className="mt-4 pt-4 border-t border-border space-y-4">
                    
                          <div className="p-3 rounded-lg bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs text-muted-foreground">Reward Earning System</p>
                              <Award className="w-4 h-4 text-amber-600" />
                            </div>
                            <p className="text-sm font-semibold mb-1">
                              Per ₺{program.pointsPerLira === 1 ? '1' : `${1 / program.pointsPerLira}`}: {program.pointsPerLira} points
                            </p>
                            <p className="text-sm text-amber-700">
                              {program.pointsForReward} points = {program.rewardValue}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <p className="text-muted-foreground mb-1">Aktif Members</p>
                              <p className="font-medium text-[var(--rose-gold)]">{program.memberCount} people</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-1">Average Score</p>
                              <p className="font-medium text-amber-600">
                                {program.memberCount > 0 ? Math.round(program.totalPointsIssued / program.memberCount) : 0}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-1">Usage Rate</p>
                              <p className="font-medium text-green-600">
                                %{program.memberCount > 0 ? Math.round(program.rewardsRedeemed / program.memberCount * 100) : 0}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-1">Pending Reward</p>
                              <p className="font-medium text-[var(--deep-indigo)]">
                                {program.totalPointsIssued > 0 ? Math.floor(program.totalPointsIssued / program.pointsForReward) - program.rewardsRedeemed : 0}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2">
                            <Label className="text-sm">Program Durumu</Label>
                            <Switch
                        checked={program.active}
                        onCheckedChange={() => toggleCampaignActive(program.id, 'loyalty')} />
                      
                          </div>
                        </motion.div>
                  }
                    </CardContent>
                  </Card>
              )}

                {loyaltyCampaigns.length === 0 &&
              <Card className="border-border/50">
                    <CardContent className="p-12 text-center">
                      <Award className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                      <p className="text-sm text-muted-foreground">
                        You haven&apos;t created a loyalty program yet
                      </p>
                    </CardContent>
                  </Card>
              }
              </div>
            </motion.div>
          </>
        }
      </div>
    </div>);

}