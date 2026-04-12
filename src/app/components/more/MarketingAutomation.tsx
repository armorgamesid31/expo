import { useState } from 'react';
import { ArrowLeft, Megaphone, MessageCircle, Users, Crown, TrendingUp, Send, CheckCircle, ChevronDown, ChevronUp, BarChart2, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface MarketingAutomationProps {
  onBack: () => void;
}

const segments = [
{
  id: 'inactive',
  label: 'Those who have not come for 3 months',
  icon: '😴',
  count: 12,
  description: 'Son 3 ayda ziyaret yok',
  color: '#F59E0B'
},
{
  id: 'vip',
  label: "VIP Müşteriler",
  icon: '👑',
  count: 7,
  description: '₺3000+ harcama yapanlar',
  color: '#B76E79'
},
{
  id: 'frequent',
  label: 'Favorites',
  icon: '⭐',
  count: 18,
  description: 'Ayda 2+ ziyaret yapanlar',
  color: '#3C3F58'
}];


const campaignPerformance = [
{ name: 'Ocak', sent: 45, opened: 32, converted: 12 },
{ name: 'feb', sent: 62, opened: 48, converted: 19 },
{ name: 'Mar', sent: 38, opened: 29, converted: 11 }];


const pastCampaigns = [
{
  id: 1,
  name: 'February Custom Offer',
  channel: 'WhatsApp',
  segment: "VIP Müşteriler",
  sent: 7,
  opened: 6,
  converted: 4,
  date: '15 Feb 2026'
},
{
  id: 2,
  name: 'Come Back Campaign',
  channel: 'WhatsApp',
  segment: 'Those who have not come for 3 months',
  sent: 12,
  opened: 9,
  converted: 3,
  date: 'Feb 1, 2026'
},
{
  id: 3,
  name: "Yeni Yıl Paketi",
  channel: 'WhatsApp',
  segment: 'Favorites',
  sent: 18,
  opened: 15,
  converted: 8,
  date: '28 Ara 2025'
}];


export function MarketingAutomation({ onBack }: MarketingAutomationProps) {
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [expandedCampaign, setExpandedCampaign] = useState<number | null>(null);

  const handleSend = () => {
    if (!selectedSegment || !message) return;
    setSentSuccess(true);
    setTimeout(() => {
      setSentSuccess(false);
      setShowCampaignForm(false);
      setSelectedSegment(null);
      setMessage('');
    }, 2500);
  };

  const selectedSegmentData = segments.find((s) => s.id === selectedSegment);

  return (
    <div className="h-full pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-background z-10 border-b border-border p-4">
        <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground mb-3 active:opacity-70">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--rose-gold)]/10 flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-[var(--rose-gold)]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Marketing Automation</h1>
            <p className="text-xs text-muted-foreground">Müşteri kampanyaları ve segmentleri</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-3 gap-3">
          
          <Card className="border-border/50">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-[var(--rose-gold)]">37</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Campaign</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-green-600">%31</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Conversion</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-[var(--deep-indigo)]">145</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Reached</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* New Campaign Button */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}>
          <button
            onClick={() => setShowCampaignForm(!showCampaignForm)}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[var(--rose-gold)] to-[var(--rose-gold-dark)] text-white text-sm font-semibold flex items-center justify-center gap-2 active:scale-98 transition-transform shadow-lg">
            
            <Send className="w-4 h-4" />
            Yeni Kampanya Oluştur
          </button>
        </motion.div>

        {/* Campaign Form */}
        {showCampaignForm &&
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.35 }}>
          
            {sentSuccess ?
          <Card className="border-green-500/30 bg-green-500/5">
                <CardContent className="p-6 text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <h3 className="font-semibold text-green-700 mb-1">Kampanya Gönderildi!</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedSegmentData?.count} customers received WhatsApp message.
                  </p>
                </CardContent>
              </Card> :

          <Card className="border-[var(--rose-gold)]/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="w-4 h-4 text-[var(--rose-gold)]" />
                    Kampanya Detayları
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Segment Selection */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block">Müşteri Segmenti</label>
                    <div className="space-y-2">
                      {segments.map((seg) =>
                  <button
                    key={seg.id}
                    onClick={() => setSelectedSegment(seg.id)}
                    className={`w-full p-3 rounded-xl text-left flex items-center gap-3 transition-all border ${selectedSegment === seg.id ? 'border-[var(--rose-gold)]/50 bg-[var(--rose-gold)]/5' : 'border-border/50 bg-muted/30'}`}>
                    
                          <span className="text-xl">{seg.icon}</span>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{seg.label}</p>
                            <p className="text-xs text-muted-foreground">{seg.description}</p>
                          </div>
                          <Badge variant="secondary" className="text-xs" style={{ backgroundColor: `${seg.color}15`, color: seg.color }}>
                            {seg.count} people
                          </Badge>
                        </button>
                  )}
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block">Mesaj</label>
                    <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder="Hello {{name}}, we missed you! This month we have a special offer via WhatsApp..."
                  className="w-full bg-muted/40 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--rose-gold)]/30 border border-border transition-all resize-none" />
                
                    <p className="text-[10px] text-muted-foreground mt-1">{"{{name}}"} variable is filled automatically</p>
                  </div>

                  <button
                onClick={handleSend}
                disabled={!selectedSegment || !message}
                className="w-full py-3 rounded-xl bg-[var(--rose-gold)] text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed active:scale-98 transition-all flex items-center justify-center gap-2">
                
                    <Send className="w-4 h-4" />
                    Gönder Campaign
                    {selectedSegmentData && ` (${selectedSegmentData.count} people)`}
                  </button>
                </CardContent>
              </Card>
          }
          </motion.div>
        }

        {/* Segments Overview */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <h2 className="font-semibold mb-3 px-1">Müşteri Segmentleri</h2>
          <div className="space-y-2">
            {segments.map((seg) =>
            <Card key={seg.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{seg.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium">{seg.label}</p>
                        <span className="text-sm font-bold" style={{ color: seg.color }}>{seg.count}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{seg.description}</p>
                      <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                        className="h-full rounded-full"
                        style={{ width: `${seg.count / 37 * 100}%`, backgroundColor: seg.color }} />
                      
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </motion.div>

        {/* Performance Chart */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
          <h2 className="font-semibold mb-3 px-1">Kampanya Performansı</h2>
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-[var(--rose-gold)]" />
                Last 3 Months Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={campaignPerformance} barSize={10}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 12 }} />
                  
                  <Bar dataKey="sent" name="Sent" fill="var(--deep-indigo)" opacity={0.4} radius={[4, 4, 0, 0]} key="bar-sent" />
                  <Bar dataKey="opened" name="opened" fill="var(--rose-gold)" opacity={0.7} radius={[4, 4, 0, 0]} key="bar-opened" />
                  <Bar dataKey="converted" name="transformed" fill="#22C55E" radius={[4, 4, 0, 0]} key="bar-converted" />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 justify-center mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[var(--deep-indigo)]/40" />
                  <span className="text-[10px] text-muted-foreground">Sent</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[var(--rose-gold)]/70" />
                  <span className="text-[10px] text-muted-foreground">Opened</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-green-500" />
                  <span className="text-[10px] text-muted-foreground">Converted</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Past Campaigns */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          <h2 className="font-semibold mb-3 px-1">Past Campaigns</h2>
          <div className="space-y-2">
            {pastCampaigns.map((camp) =>
            <Card key={camp.id} className="border-border/50">
                <CardContent className="p-4">
                  <button
                  className="w-full text-left"
                  onClick={() => setExpandedCampaign(expandedCampaign === camp.id ? null : camp.id)}>
                  
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{camp.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className={`text-[10px] py-0 h-4 ${camp.channel === 'WhatsApp' ? 'bg-green-500/10 text-green-700' : 'bg-blue-500/10 text-blue-700'}`}>
                            {camp.channel}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">{camp.date}</span>
                        </div>
                      </div>
                      {expandedCampaign === camp.id ?
                    <ChevronUp className="w-4 h-4 text-muted-foreground" /> :

                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    }
                    </div>
                  </button>
                  {expandedCampaign === camp.id &&
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.25 }}
                  className="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-3">
                  
                      <div className="text-center">
                        <p className="text-lg font-bold text-[var(--deep-indigo)]">{camp.sent}</p>
                        <p className="text-[10px] text-muted-foreground">Sent</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-[var(--rose-gold)]">{camp.opened}</p>
                        <p className="text-[10px] text-muted-foreground">Opened</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-green-600">{camp.converted}</p>
                        <p className="text-[10px] text-muted-foreground">Converted</p>
                      </div>
                    </motion.div>
                }
                </CardContent>
              </Card>
            )}
          </div>
        </motion.div>
      </div>
    </div>);

}