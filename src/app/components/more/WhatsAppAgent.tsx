import { useEffect, useState } from 'react';
import { ArrowLeft, MessageCircle, Bot, Zap, TrendingUp, CheckCircle2, XCircle, ChevronRight, CircleHelp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../ui/card';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { readSnapshot, writeSnapshot } from '../../lib/ui-cache';

interface WhatsAppAgentProps {
  onBack: () => void;
}

const conversations = [
  {
    id: 1,
    name: 'Ayse Yilmaz',
    message: 'Can I make an appointment for Saturday?',
    time: '14:23',
    resolved: true,
    converted: true,
  },
  {
    id: 2,
    name: 'Elif Demir',
    message: 'What are your manicure prices?',
    time: '13:45',
    resolved: true,
    converted: false,
  },
  {
    id: 3,
    name: 'Zeynep Kaya',
    message: 'Thursday appointmentmu iptal etmek istiyorum',
    time: '12:10',
    resolved: true,
    converted: false,
  },
  {
    id: 4,
    name: 'Merve Sahin',
    message: 'How long does hair dyeing take?',
    time: '11:30',
    resolved: false,
    converted: false,
  },
];

const CHAKRA_STATUS_CACHE_KEY = 'chakra:status';
const WHATSAPP_AGENT_SETTINGS_CACHE_KEY = 'whatsapp:agent-settings';

export function WhatsAppAgent({ onBack }: WhatsAppAgentProps) {
  const navigate = useNavigate();
  const { apiFetch } = useAuth();
  const cachedStatus = readSnapshot<{ connected?: boolean; isActive?: boolean }>(CHAKRA_STATUS_CACHE_KEY, 1000 * 60 * 10);
  const cachedSettings = readSnapshot<{
    isEnabled?: boolean;
    tone?: 'friendly' | 'professional' | 'balanced';
    answerLength?: 'short' | 'medium' | 'detailed';
    emojiUsage?: 'off' | 'low' | 'normal';
    bookingGuidance?: 'low' | 'medium' | 'high';
    handoverThreshold?: 'early' | 'balanced' | 'late';
    aiDisclosure?: 'always' | 'onQuestion' | 'never';
  }>(WHATSAPP_AGENT_SETTINGS_CACHE_KEY, 1000 * 60 * 10);

  const [agentEnabled, setAgentEnabled] = useState(Boolean(cachedSettings?.isEnabled));
  const [chakraConnected, setChakraConnected] = useState(Boolean(cachedStatus?.connected) || Boolean(cachedStatus?.isActive));
  const [chakraPluginActive, setChakraPluginActive] = useState(Boolean(cachedStatus?.isActive));
  const [togglingAgent, setTogglingAgent] = useState(false);
  const [toggleFeedback, setToggleFeedback] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedField, setSavedField] = useState<string | null>(null);
  const [tone, setTone] = useState<'friendly' | 'professional' | 'balanced'>(cachedSettings?.tone || 'balanced');
  const [answerLength, setAnswerLength] = useState<'short' | 'medium' | 'detailed'>(cachedSettings?.answerLength || 'medium');
  const [emojiUsage, setEmojiUsage] = useState<'off' | 'low' | 'normal'>(cachedSettings?.emojiUsage || 'low');
  const [bookingGuidance, setBookingGuidance] = useState<'low' | 'medium' | 'high'>(cachedSettings?.bookingGuidance || 'medium');
  const [handoverThreshold, setHandoverThreshold] = useState<'early' | 'balanced' | 'late'>(cachedSettings?.handoverThreshold || 'balanced');
  const [aiDisclosure, setAiDisclosure] = useState<'always' | 'onQuestion' | 'never'>(cachedSettings?.aiDisclosure || 'onQuestion');

  const conversionRate = 68;
  const totalConversations = 47;
  const resolvedByBot = 39;
  const toneExamples: Record<typeof tone, string> = {
    friendly: '"Hello, let me help you right away. Shall we find a suitable time?"',
    professional: '"I have received your request. I can share a clear recommendation by checking the appropriate time period."',
    balanced: '"I can check the available hours and immediately inform you of the most suitable appointment option."',
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [response, chakraStatus] = await Promise.all([
          apiFetch<{
            settings?: {
              tone?: 'friendly' | 'professional' | 'balanced';
              answerLength?: 'short' | 'medium' | 'detailed';
              emojiUsage?: 'off' | 'low' | 'normal';
              bookingGuidance?: 'low' | 'medium' | 'high';
              handoverThreshold?: 'early' | 'balanced' | 'late';
              aiDisclosure?: 'always' | 'onQuestion' | 'never';
              isEnabled?: boolean;
            };
          }>('/api/admin/whatsapp-agent/settings'),
          apiFetch<{ connected?: boolean; isActive?: boolean; pluginId?: string | null }>(`/api/app/chakra/status?t=${Date.now()}`).catch(() => null),
        ]);

        const isConnected = Boolean(chakraStatus?.connected) || Boolean(chakraStatus?.isActive);
        const isActive = Boolean(chakraStatus?.isActive);

        if (active) {
          setChakraConnected(isConnected);
          setChakraPluginActive(isActive);
          writeSnapshot(CHAKRA_STATUS_CACHE_KEY, chakraStatus || {});
        }

        if (!active || !response?.settings) return;
        setAgentEnabled(Boolean(response.settings.isEnabled));
        if (response.settings.tone) setTone(response.settings.tone);
        if (response.settings.answerLength) setAnswerLength(response.settings.answerLength);
        if (response.settings.emojiUsage) setEmojiUsage(response.settings.emojiUsage);
        if (response.settings.bookingGuidance) setBookingGuidance(response.settings.bookingGuidance);
        if (response.settings.handoverThreshold) setHandoverThreshold(response.settings.handoverThreshold);
        if (response.settings.aiDisclosure) setAiDisclosure(response.settings.aiDisclosure);
        writeSnapshot(WHATSAPP_AGENT_SETTINGS_CACHE_KEY, response.settings);
      } catch (error) {
        console.error('WhatsApp agent settings load failed:', error);
      }
    })();
    return () => {
      active = false;
    };
  }, [apiFetch]);

  async function toggleAgentActive(nextValue: boolean) {
    setToggleError(null);
    setToggleFeedback(null);

    if (!chakraConnected) {
      setToggleError('Complete WhatsApp connection first.');
      return;
    }

    if (!chakraPluginActive) {
      setToggleError('WhatsApp connection is inactive. You must activate the connection first.');
      return;
    }

    const previous = agentEnabled;
    setAgentEnabled(nextValue);
    setTogglingAgent(true);

    try {
      await apiFetch('/api/admin/whatsapp-agent/settings', {
        method: 'PUT',
        body: JSON.stringify({
          isEnabled: nextValue,
          tone,
          answerLength,
          emojiUsage,
          bookingGuidance,
          handoverThreshold,
          aiDisclosure,
        }),
      });

      setToggleFeedback(
        nextValue
          ? 'AI agent activated.'
          : 'AI agent has been disabled.',
      );
      writeSnapshot(WHATSAPP_AGENT_SETTINGS_CACHE_KEY, {
        isEnabled: nextValue,
        tone,
        answerLength,
        emojiUsage,
        bookingGuidance,
        handoverThreshold,
        aiDisclosure,
      });
      setTimeout(() => {
        setToggleFeedback(null);
      }, 2000);

    } catch (error) {
      console.error('WhatsApp agent toggle failed:', error);
      setAgentEnabled(previous);
      setToggleError('Activity status could not be updated. Please try again.');
    } finally {
      setTogglingAgent(false);
    }
  }

  async function saveSettings(fieldKey: string, overrides?: Partial<{
    isEnabled: boolean;
    tone: 'friendly' | 'professional' | 'balanced';
    answerLength: 'short' | 'medium' | 'detailed';
    emojiUsage: 'off' | 'low' | 'normal';
    bookingGuidance: 'low' | 'medium' | 'high';
    handoverThreshold: 'early' | 'balanced' | 'late';
    aiDisclosure: 'always' | 'onQuestion' | 'never';
  }>) {
    setIsSaving(true);
    try {
      await apiFetch('/api/admin/whatsapp-agent/settings', {
        method: 'PUT',
        body: JSON.stringify({
          isEnabled: overrides?.isEnabled ?? agentEnabled,
          tone: overrides?.tone ?? tone,
          answerLength: overrides?.answerLength ?? answerLength,
          emojiUsage: overrides?.emojiUsage ?? emojiUsage,
          bookingGuidance: overrides?.bookingGuidance ?? bookingGuidance,
          handoverThreshold: overrides?.handoverThreshold ?? handoverThreshold,
          aiDisclosure: overrides?.aiDisclosure ?? aiDisclosure,
        }),
      });
      setSavedField(fieldKey);
      writeSnapshot(WHATSAPP_AGENT_SETTINGS_CACHE_KEY, {
        isEnabled: overrides?.isEnabled ?? agentEnabled,
        tone: overrides?.tone ?? tone,
        answerLength: overrides?.answerLength ?? answerLength,
        emojiUsage: overrides?.emojiUsage ?? emojiUsage,
        bookingGuidance: overrides?.bookingGuidance ?? bookingGuidance,
        handoverThreshold: overrides?.handoverThreshold ?? handoverThreshold,
        aiDisclosure: overrides?.aiDisclosure ?? aiDisclosure,
      });
      setTimeout(() => setSavedField((prev) => (prev === fieldKey ? null : prev)), 1800);
    } catch (error) {
      console.error('WhatsApp agent settings save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="h-full pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-background z-10 border-b border-border p-4">
        <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground mb-3 active:opacity-70">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">AI WhatsApp Agent</h1>
              <p className="text-xs text-muted-foreground">Automated customer communication</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/app/features/whatsapp-agent-faq')}
              className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground active:opacity-70 mt-0.5"
              aria-label="Open AI agent standard FAQ screen"
            >
              <CircleHelp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Agent Status */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Card
            className={`border-2 transition-all ${
              !chakraConnected
                ? 'border-amber-500/30 bg-amber-500/5'
                : !chakraPluginActive
                  ? 'border-amber-500/30 bg-amber-500/5'
                  : agentEnabled
                  ? 'border-green-500/30 bg-green-500/5'
                  : 'border-border/50'
            }`}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                      !chakraConnected ? 'bg-amber-500' : !chakraPluginActive ? 'bg-amber-500' : agentEnabled ? 'bg-green-500' : 'bg-muted'
                    }`}
                  >
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">Ajan Durumu</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          !chakraConnected
                            ? 'bg-amber-500'
                            : !chakraPluginActive
                              ? 'bg-amber-500'
                              : agentEnabled
                                ? 'bg-green-500 animate-pulse'
                                : 'bg-gray-400'
                        }`}
                      />
                      <span
                        className={`text-sm ${
                          !chakraConnected
                            ? 'text-amber-700'
                            : !chakraPluginActive
                              ? 'text-amber-700'
                              : agentEnabled
                                ? 'text-green-600'
                                : 'text-muted-foreground'
                        }`}
                      >
                        {!chakraConnected
                          ? 'Not connected — Setup required'
                          : !chakraPluginActive
                            ? 'WhatsApp disabled — Open the connection from manage'
                            : agentEnabled
                              ? 'Active — Replying to messages'
                              : 'Pasif'}
                      </span>
                    </div>
                    {toggleFeedback ? (
                      <p className="text-xs text-green-600 mt-1">{toggleFeedback}</p>
                    ) : null}
                    {toggleError ? (
                      <p className="text-xs text-red-600 mt-1">{toggleError}</p>
                    ) : null}
                  </div>
                </div>
                <Switch
                  checked={agentEnabled}
                  onCheckedChange={(checked) => {
                    void toggleAgentActive(checked);
                  }}
                  disabled={!chakraConnected || !chakraPluginActive || togglingAgent}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {chakraConnected && !chakraPluginActive ? (
          <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="p-3 flex items-start gap-2">
              <XCircle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  WhatsApp connection is inactive. Activate the connection first for the AI agent to run.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => navigate('/app/features/whatsapp-settings', { state: { navDirection: 'back' } })}
                >
                  Go to WhatsApp Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Conversation Insights */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}>
          <h2 className="font-semibold mb-3 px-1">Conversation Analytics</h2>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <Card className="border-border/50">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-[var(--rose-gold)]">{totalConversations}</p>
                <p className="text-[10px] text-muted-foreground mt-1">This Week</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-green-600">%{conversionRate}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Conversion</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-[var(--deep-indigo)]">{resolvedByBot}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Bot Resolved</p>
              </CardContent>
            </Card>
          </div>

          {/* Conversion Bar */}
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[var(--rose-gold)]" />
                  Appointment Conversion Rate
                </span>
                <span className="text-sm font-bold text-[var(--rose-gold)]">%{conversionRate}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[var(--rose-gold)] to-green-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${conversionRate}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">{totalConversations} conversations, {Math.round(totalConversations * conversionRate / 100)} appointments were created</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Conversations */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
          <h2 className="font-semibold mb-3 px-1">Recent Conversations</h2>
          <div className="space-y-2">
            {conversations.map((conv) => (
              <Card key={conv.id} className="border-border/50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[var(--rose-gold)]/10 flex items-center justify-center text-sm font-semibold text-[var(--rose-gold)] shrink-0">
                      {conv.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{conv.name}</p>
                        {conv.converted && (
                          <Badge variant="secondary" className="bg-green-500/10 text-green-700 text-[10px] py-0 h-4">Appointment</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{conv.message}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] text-muted-foreground">{conv.time}</span>
                      {conv.resolved ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-amber-500" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Agent Settings */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="font-semibold">Agent Settings</h2>
          </div>
          <Card className="border-border/50">
            <CardContent className="p-4 space-y-4">
              <Card className="border-border/50">
                <CardContent className="p-3 space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Conversation tone</p>
                    <p className="text-xs text-muted-foreground">The overall style the agent uses while talking to customers.</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button type="button" variant={tone === 'friendly' ? 'default' : 'outline'} onClick={() => { setTone('friendly'); void saveSettings('tone', { tone: 'friendly' }); }}>Warm & Friendly</Button>
                      <Button type="button" variant={tone === 'professional' ? 'default' : 'outline'} onClick={() => { setTone('professional'); void saveSettings('tone', { tone: 'professional' }); }}>Professional</Button>
                      <Button type="button" className="col-span-2" variant={tone === 'balanced' ? 'default' : 'outline'} onClick={() => { setTone('balanced'); void saveSettings('tone', { tone: 'balanced' }); }}>Balanced</Button>
                    </div>
                    <p className="text-xs text-muted-foreground border border-border/60 rounded-md p-2 bg-muted/30">
                      Example approach: {toneExamples[tone]}
                    </p>
                    {savedField === 'tone' ? <p className="text-[11px] text-green-600">Saved.</p> : null}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Response length</p>
                    <p className="text-xs text-muted-foreground">Controls whether responses to customers are short or detailed.</p>
                    <div className="grid grid-cols-3 gap-2">
                      <Button type="button" variant={answerLength === 'short' ? 'default' : 'outline'} onClick={() => { setAnswerLength('short'); void saveSettings('answerLength', { answerLength: 'short' }); }}>Short</Button>
                      <Button type="button" variant={answerLength === 'medium' ? 'default' : 'outline'} onClick={() => { setAnswerLength('medium'); void saveSettings('answerLength', { answerLength: 'medium' }); }}>Medium</Button>
                      <Button type="button" variant={answerLength === 'detailed' ? 'default' : 'outline'} onClick={() => { setAnswerLength('detailed'); void saveSettings('answerLength', { answerLength: 'detailed' }); }}>Detailed</Button>
                    </div>
                    {savedField === 'answerLength' ? <p className="text-[11px] text-green-600">Saved.</p> : null}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Emoji usage</p>
                    <p className="text-xs text-muted-foreground">Controls emoji density in responses.</p>
                    <div className="grid grid-cols-3 gap-2">
                      <Button type="button" variant={emojiUsage === 'off' ? 'default' : 'outline'} onClick={() => { setEmojiUsage('off'); void saveSettings('emojiUsage', { emojiUsage: 'off' }); }}>Closed</Button>
                      <Button type="button" variant={emojiUsage === 'low' ? 'default' : 'outline'} onClick={() => { setEmojiUsage('low'); void saveSettings('emojiUsage', { emojiUsage: 'low' }); }}>Low</Button>
                      <Button type="button" variant={emojiUsage === 'normal' ? 'default' : 'outline'} onClick={() => { setEmojiUsage('normal'); void saveSettings('emojiUsage', { emojiUsage: 'normal' }); }}>Normal</Button>
                    </div>
                    {savedField === 'emojiUsage' ? <p className="text-[11px] text-green-600">Saved.</p> : null}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Booking guidance level</p>
                    <p className="text-xs text-muted-foreground">Determines how actively the customer is guided to booking during conversation.</p>
                    <div className="grid grid-cols-3 gap-2">
                      <Button type="button" variant={bookingGuidance === 'low' ? 'default' : 'outline'} onClick={() => { setBookingGuidance('low'); void saveSettings('bookingGuidance', { bookingGuidance: 'low' }); }}>Low</Button>
                      <Button type="button" variant={bookingGuidance === 'medium' ? 'default' : 'outline'} onClick={() => { setBookingGuidance('medium'); void saveSettings('bookingGuidance', { bookingGuidance: 'medium' }); }}>Medium</Button>
                      <Button type="button" variant={bookingGuidance === 'high' ? 'default' : 'outline'} onClick={() => { setBookingGuidance('high'); void saveSettings('bookingGuidance', { bookingGuidance: 'high' }); }}>High</Button>
                    </div>
                    {savedField === 'bookingGuidance' ? <p className="text-[11px] text-green-600">Saved.</p> : null}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Human handover threshold</p>
                    <p className="text-xs text-muted-foreground">Determines how early the agent hands over to human staff in cases of dissatisfaction risk, complex requests, or complaints.</p>
                    <div className="grid grid-cols-3 gap-2">
                      <Button type="button" variant={handoverThreshold === 'early' ? 'default' : 'outline'} onClick={() => { setHandoverThreshold('early'); void saveSettings('handoverThreshold', { handoverThreshold: 'early' }); }}>Early Handover</Button>
                      <Button type="button" variant={handoverThreshold === 'balanced' ? 'default' : 'outline'} onClick={() => { setHandoverThreshold('balanced'); void saveSettings('handoverThreshold', { handoverThreshold: 'balanced' }); }}>Balanced</Button>
                      <Button type="button" variant={handoverThreshold === 'late' ? 'default' : 'outline'} onClick={() => { setHandoverThreshold('late'); void saveSettings('handoverThreshold', { handoverThreshold: 'late' }); }}>Late Handover</Button>
                    </div>
                    {savedField === 'handoverThreshold' ? <p className="text-[11px] text-green-600">Saved.</p> : null}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">AI disclosure</p>
                    <p className="text-xs text-muted-foreground">Determines how often the agent identifies itself as AI in conversation.</p>
                    <div className="grid grid-cols-3 gap-2">
                      <Button type="button" variant={aiDisclosure === 'always' ? 'default' : 'outline'} onClick={() => { setAiDisclosure('always'); void saveSettings('aiDisclosure', { aiDisclosure: 'always' }); }}>Always</Button>
                      <Button type="button" variant={aiDisclosure === 'onQuestion' ? 'default' : 'outline'} onClick={() => { setAiDisclosure('onQuestion'); void saveSettings('aiDisclosure', { aiDisclosure: 'onQuestion' }); }}>If asked</Button>
                      <Button type="button" variant={aiDisclosure === 'never' ? 'default' : 'outline'} onClick={() => { setAiDisclosure('never'); void saveSettings('aiDisclosure', { aiDisclosure: 'never' }); }}>Do not mention</Button>
                    </div>
                    {savedField === 'aiDisclosure' ? <p className="text-[11px] text-green-600">Saved.</p> : null}
                  </div>
                </CardContent>
              </Card>

            </CardContent>
          </Card>
        </motion.div>

        {/* Zap CTA */}
        <Card className="border-0 bg-gradient-to-br from-green-600 to-[var(--deep-indigo)] overflow-hidden">
          <CardContent className="p-5 relative">
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/5" />
            <div className="flex items-center gap-3 relative z-10">
              <Zap className="w-6 h-6 text-white" />
              <div className="text-white">
                <p className="font-semibold text-sm">Connect Agent to WhatsApp</p>
                <p className="text-xs text-white/70 mt-0.5">Verify your number +90 544 xxx xxxx</p>
              </div>
              <ChevronRight className="w-5 h-5 text-white/60 ml-auto" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
