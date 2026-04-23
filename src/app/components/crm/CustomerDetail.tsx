import { ArrowLeft, Phone, Mail, Calendar, DollarSign, TrendingUp, FileText, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Customer } from '../../types';
import { customerVisits } from '../../data/mockData';

interface CustomerDetailProps {
  customer: Customer;
  onBack: () => void;
}

export function CustomerDetail({ customer, onBack }: CustomerDetailProps) {
  const visits = customerVisits[customer.id] || [];

  const getRiskBadgeStyle = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20';
      case 'medium':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20';
      default:
        return 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-300">Tamamlandı</Badge>;
      case 'no-show':
        return <Badge variant="secondary" className="bg-red-500/10 text-red-700 dark:text-red-300">Randevu İhlali</Badge>;
      case 'cancelled':
        return <Badge variant="secondary" className="bg-gray-500/10 text-gray-700 dark:text-gray-300">İptal</Badge>;
      default:
        return <Badge>Planlandı</Badge>;
    }
  };

  return (
    <div className="h-full pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-background z-10 border-b border-border p-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Müşterilere Dön
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold mb-1">{customer.name}</h1>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`text-xs ${getRiskBadgeStyle(customer.riskLevel)}`}>
                
                {customer.riskLevel === 'high' && <AlertTriangle className="w-3 h-3 mr-1" />}
                <span className="capitalize">Risk: {customer.riskLevel === 'low' ? 'Düşük' : customer.riskLevel === 'medium' ? 'Orta' : 'Yüksek'}</span>
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Contact Info */}
        <Card className="border-border/50">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--rose-gold)]/10 flex items-center justify-center">
                <Phone className="w-5 h-5 text-[var(--rose-gold)]" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Telefon</p>
                <p className="font-medium">{customer.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--deep-indigo)]/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-[var(--deep-indigo)]" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">E-posta</p>
                <p className="font-medium text-sm">{customer.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <Calendar className="w-5 h-5 mx-auto mb-2 text-[var(--rose-gold)]" />
              <p className="text-2xl font-bold">{customer.visitCount}</p>
              <p className="text-xs text-muted-foreground">Toplam Ziyaret</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <DollarSign className="w-5 h-5 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold text-green-600">₺{customer.totalSpent.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Toplam Harcama</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-5 h-5 mx-auto mb-2 text-[var(--deep-indigo)]" />
              <p className="text-2xl font-bold">₺{Math.round(customer.totalSpent / customer.visitCount)}</p>
              <p className="text-xs text-muted-foreground">Ort. Ziyaret</p>
            </CardContent>
          </Card>
        </div>

        {/* Risk Profile */}
        {customer.riskLevel !== 'low' &&
        <Card className={`border-2 ${customer.riskLevel === 'high' ? 'border-red-500/30 bg-red-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className={`w-4 h-4 ${customer.riskLevel === 'high' ? 'text-red-600' : 'text-amber-600'}`} />
                Risk Profili Analizi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Randevu İhlali Sayısı:</span>
                <span className="font-semibold text-red-600">{customer.noShowCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Randevu İhlali Oranı:</span>
                <span className="font-semibold">
                  %{(customer.noShowCount / customer.visitCount * 100).toFixed(1)}
                </span>
              </div>
              {customer.riskLevel === 'high' &&
            <div className="pt-2 mt-2 border-t border-border">
                  <p className="text-xs text-red-700 dark:text-red-300">
                    <strong>Öneri:</strong> Gelecek rezervasyonlar için kapora alın. Randevudan 24 saat önce WhatsApp hatırlatması gönderin.
                  </p>
                </div>
            }
            </CardContent>
          </Card>
        }

        {/* Notes */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Notlar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{customer.notes}</p>
          </CardContent>
        </Card>

        {/* Visit History */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Ziyaret Geçmişi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {visits.map((visit) =>
            <div key={visit.id} className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm">{visit.date}</p>
                    <p className="text-xs text-muted-foreground">{visit.staff} ile</p>
                  </div>
                  {getStatusBadge(visit.status)}
                </div>
                <div className="space-y-1 mb-2">
                  {visit.services.map((service, idx) =>
                <p key={idx} className="text-sm">• {service}</p>
                )}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground">Toplam</span>
                  <span className="font-semibold text-[var(--rose-gold)]">₺{visit.total}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="w-full">
            <Calendar className="w-4 h-4 mr-2" />
            Randevu Al
          </Button>
          <Button className="w-full bg-[var(--rose-gold)] hover:bg-[var(--rose-gold-dark)]">
            <Phone className="w-4 h-4 mr-2" />
            Müşteriyi Ara
          </Button>
        </div>
      </div>
    </div>);

}
