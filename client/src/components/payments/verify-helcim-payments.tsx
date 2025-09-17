import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function VerifyHelcimPayments() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const { toast } = useToast();

  const runVerification = async () => {
    setIsVerifying(true);
    setVerificationResult(null);

    try {
      const response = await apiRequest('POST', '/api/verify-helcim-payments', {
        date: selectedDate
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Verification failed' }));
        throw new Error(errorData.message || 'Verification failed');
      }
      
      const result = await response.json();
      
      // Normalize the result to handle both array and number formats
      const normalizedResult = {
        ...result,
        unverifiedAppointmentsCount: Array.isArray(result.unverifiedAppointments) 
          ? result.unverifiedAppointments.length 
          : (result.unverifiedAppointments || 0),
        unmatchedTransactionsCount: Array.isArray(result.unmatched) 
          ? result.unmatched.length 
          : (result.unmatchedTransactions || 0)
      };
      
      setVerificationResult(normalizedResult);
      
      if (normalizedResult.unverifiedAppointmentsCount > 0 || normalizedResult.unmatchedTransactionsCount > 0) {
        toast({
          title: "Verification Complete",
          description: `Found ${normalizedResult.unverifiedAppointmentsCount} unverified appointments and ${normalizedResult.unmatchedTransactionsCount} unmatched Helcim transactions`,
          variant: "default"
        });
      } else {
        toast({
          title: "All Payments Verified",
          description: "All payments are properly matched and verified.",
        });
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      toast({
        title: "Verification Failed",
        description: err.message || 'Failed to verify payments. Please ensure Helcim API is configured.',
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Helcim Payment Verification</CardTitle>
          <CardDescription>
            Match Helcim transactions with appointments to identify unverified payments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="date" className="text-sm font-medium">
                Verification Date
              </label>
              <input
                type="date"
                id="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border rounded px-3 py-1.5 text-sm"
                disabled={isVerifying}
              />
            </div>
            <Button 
              onClick={runVerification} 
              disabled={isVerifying}
              className="ml-auto"
              size="sm"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Run Verification
                </>
              )}
            </Button>
          </div>

          {verificationResult && (
            <div className="space-y-4 mt-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <div className="text-2xl font-bold">{verificationResult.helcimTransactions || 0}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Helcim Transactions</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                  <div className="text-2xl font-bold text-green-600">{verificationResult.matchedTransactions || 0}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Matched</div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
                  <div className="text-2xl font-bold text-orange-600">{verificationResult.unmatchedTransactionsCount || 0}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Unmatched in Helcim</div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                  <div className="text-2xl font-bold text-red-600">{verificationResult.unverifiedAppointmentsCount || 0}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Unverified in App</div>
                </div>
              </div>

              {/* Unverified Appointments */}
              {verificationResult.unverifiedAppointments?.length > 0 && (
                <Card className="border-red-200 dark:border-red-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-red-600 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Unverified Appointments (Marked as Paid but No Helcim Transaction)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b">
                          <tr>
                            <th className="text-left p-2">Appt ID</th>
                            <th className="text-left p-2">Client</th>
                            <th className="text-left p-2">Time</th>
                            <th className="text-right p-2">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {verificationResult.unverifiedAppointments.slice(0, 10).map((apt: any) => (
                            <tr key={apt.appointmentId} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="p-2 font-mono text-xs">#{apt.appointmentId}</td>
                              <td className="p-2">Client {apt.clientId}</td>
                              <td className="p-2">{apt.startTime ? format(new Date(apt.startTime), 'h:mm a') : 'N/A'}</td>
                              <td className="p-2 text-right font-medium">{formatCurrency(apt.totalAmount || 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {verificationResult.unverifiedAppointments.length > 10 && (
                        <div className="text-xs text-gray-500 mt-2 text-center">
                          Showing 10 of {verificationResult.unverifiedAppointments.length} unverified appointments
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Unmatched Helcim Transactions */}
              {verificationResult.unmatched?.length > 0 && (
                <Card className="border-orange-200 dark:border-orange-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-orange-600 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Unmatched Helcim Transactions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b">
                          <tr>
                            <th className="text-left p-2">Trans ID</th>
                            <th className="text-left p-2">Card</th>
                            <th className="text-right p-2">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {verificationResult.unmatched.slice(0, 10).map((tx: any) => (
                            <tr key={tx.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="p-2 font-mono text-xs">#{tx.id}</td>
                              <td className="p-2">****{tx.cardLast4 || '????'}</td>
                              <td className="p-2 text-right font-medium">{formatCurrency(tx.amount || 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {verificationResult.unmatched.length > 10 && (
                        <div className="text-xs text-gray-500 mt-2 text-center">
                          Showing 10 of {verificationResult.unmatched.length} unmatched transactions
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Success Message */}
              {verificationResult.matchedTransactions > 0 && 
               verificationResult.unverifiedAppointmentsCount === 0 && 
               verificationResult.unmatchedTransactionsCount === 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-medium text-green-800 dark:text-green-200">All Payments Verified</div>
                    <div className="text-sm text-green-600 dark:text-green-400">
                      {verificationResult.matchedTransactions} transactions successfully matched
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {!verificationResult && !isVerifying && (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-2">Click "Run Verification" to check for unverified payments</p>
              <p className="text-xs">This will match today's Helcim transactions with appointments</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment Status Indicators</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-green-600">Card ****1234</Badge>
            <span className="text-gray-600">Verified card payment with last 4 digits</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-orange-600">⚠️ Unverified</Badge>
            <span className="text-gray-600">Payment marked as paid but no matching Helcim transaction</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Cash</Badge>
            <span className="text-gray-600">Cash payment (no verification needed)</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}