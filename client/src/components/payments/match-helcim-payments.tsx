import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, CheckCircle, XCircle, AlertCircle, Link, ArrowRight, CreditCard } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function MatchHelcimPayments() {
  const [isMatching, setIsMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [autoUpdate, setAutoUpdate] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [isLinking, setIsLinking] = useState(false);

  const runMatching = async () => {
    setIsMatching(true);
    setMatchResult(null);
    
    try {
      const response = await apiRequest('POST', '/api/match-helcim-payments', {
        date: selectedDate,
        autoUpdate
      });
      
      setMatchResult(response);
      
      if (response.summary) {
        const { matched, unmatched, unverifiedAppointments } = response.summary;
        
        if (matched > 0 || unmatched === 0) {
          toast({
            title: "Matching Complete",
            description: `Successfully matched ${matched} transactions. ${unmatched} unmatched, ${unverifiedAppointments} unverified.`,
          });
        } else {
          toast({
            title: "Matching Issues Found",
            description: `${unmatched} Helcim transactions couldn't be matched. Manual review required.`,
            variant: "default"
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Matching Failed",
        description: error.message || 'Failed to match payments',
        variant: "destructive"
      });
      setMatchResult(null);
    } finally {
      setIsMatching(false);
    }
  };

  const handleManualLink = async (transactionId: string, appointmentId: number, amount: number, cardLast4?: string) => {
    setIsLinking(true);
    
    try {
      await apiRequest('POST', '/api/manual-match-payment', {
        transactionId,
        appointmentId,
        amount,
        cardLast4
      });
      
      toast({
        title: "Payment Linked",
        description: "Successfully linked payment to appointment",
      });
      
      setSelectedMatch(null);
      // Re-run matching to update results
      await runMatching();
    } catch (error: any) {
      toast({
        title: "Linking Failed",
        description: error.message || 'Failed to link payment',
        variant: "destructive"
      });
    } finally {
      setIsLinking(false);
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 90) {
      return <Badge className="bg-green-100 text-green-800">High ({confidence}%)</Badge>;
    } else if (confidence >= 70) {
      return <Badge className="bg-yellow-100 text-yellow-800">Medium ({confidence}%)</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">Low ({confidence}%)</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Match Helcim Payments</CardTitle>
          <CardDescription>
            Advanced matching algorithm to connect Helcim transactions with appointments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoUpdate"
                checked={autoUpdate}
                onChange={(e) => setAutoUpdate(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="autoUpdate" className="text-sm">
                Auto-update matched payments
              </label>
            </div>
            <Button 
              onClick={runMatching} 
              disabled={isMatching}
              className="min-w-[150px]"
            >
              {isMatching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Matching...
                </>
              ) : (
                <>
                  <Link className="mr-2 h-4 w-4" />
                  Run Matching
                </>
              )}
            </Button>
          </div>

          {!autoUpdate && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Manual Mode</AlertTitle>
              <AlertDescription>
                Matches will be displayed but not automatically saved. You can review and manually link transactions.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {matchResult && (
        <>
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Matching Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{matchResult.summary.helcimTransactions}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Helcim Transactions</div>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{matchResult.summary.matched}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Matched</div>
                </div>
                <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{matchResult.summary.unmatched}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Unmatched</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{matchResult.summary.possibleMatches}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Possible Matches</div>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{matchResult.summary.unverifiedAppointments}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Unverified</div>
                </div>
              </div>
              
              {matchResult.summary.matchRates && (
                <div className="mt-4 flex gap-2">
                  <Badge className="bg-green-100 text-green-800">
                    High Confidence: {matchResult.summary.matchRates.high}
                  </Badge>
                  <Badge className="bg-yellow-100 text-yellow-800">
                    Medium: {matchResult.summary.matchRates.medium}
                  </Badge>
                  <Badge className="bg-red-100 text-red-800">
                    Low: {matchResult.summary.matchRates.low}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Matched Transactions */}
          {matchResult.matched?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Matched Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Helcim ID</TableHead>
                      <TableHead>Appointment</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Card</TableHead>
                      <TableHead>Match Reason</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matchResult.matched.map((match: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-xs">
                          {match.helcimTransactionId}
                        </TableCell>
                        <TableCell>#{match.appointmentId}</TableCell>
                        <TableCell>${match.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          {match.cardLast4 && (
                            <span className="font-mono">****{match.cardLast4}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{match.matchReason}</TableCell>
                        <TableCell>{getConfidenceBadge(match.confidence)}</TableCell>
                        <TableCell>
                          {match.updated ? (
                            <Badge className="bg-green-100 text-green-800">Updated</Badge>
                          ) : match.updateError ? (
                            <Badge variant="destructive">Error</Badge>
                          ) : (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Possible Matches */}
          {matchResult.possibleMatches?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  Possible Matches (Manual Review Required)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {matchResult.possibleMatches.map((possible: any, idx: number) => (
                  <div key={idx} className="border rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-semibold">
                          Helcim Transaction: ${possible.transaction.amount}
                        </div>
                        <div className="text-sm text-gray-600">
                          Card: ****{possible.transaction.cardNumber?.slice(-4)} • 
                          {format(new Date(possible.transaction.dateCreated), 'MMM d, h:mm a')}
                        </div>
                      </div>
                      <Badge variant="outline">{possible.reason}</Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Possible Appointments:</div>
                      {possible.possibleAppointments.map((apt: any) => (
                        <div key={apt.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          <div className="text-sm">
                            <span className="font-medium">#{apt.id}</span> • 
                            Client {apt.clientId} • 
                            ${apt.amount}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedMatch({
                              transaction: possible.transaction,
                              appointment: apt
                            })}
                          >
                            Link
                            <ArrowRight className="ml-1 h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Unmatched Transactions */}
          {matchResult.unmatched?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  Unmatched Helcim Transactions
                </CardTitle>
                <CardDescription>
                  These transactions were processed through Helcim but couldn't be matched to appointments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Card</TableHead>
                      <TableHead>Cardholder</TableHead>
                      <TableHead>Date/Time</TableHead>
                      <TableHead>Invoice #</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matchResult.unmatched.map((tx: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-xs">
                          {tx.transaction?.transactionId || tx.transaction?.id || 'N/A'}
                        </TableCell>
                        <TableCell className="font-semibold">${tx.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          {tx.cardLast4 && (
                            <span className="font-mono">****{tx.cardLast4}</span>
                          )}
                        </TableCell>
                        <TableCell>{tx.cardHolderName || '-'}</TableCell>
                        <TableCell className="text-sm">
                          {tx.dateCreated && format(new Date(tx.dateCreated), 'MMM d, h:mm a')}
                        </TableCell>
                        <TableCell>{tx.invoiceNumber || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Unverified Appointments */}
          {matchResult.unverifiedAppointments?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  Unverified Appointments
                </CardTitle>
                <CardDescription>
                  These appointments are marked as paid but have no matching Helcim transaction
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Appointment</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Payment Method</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matchResult.unverifiedAppointments.map((apt: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-semibold">#{apt.appointmentId}</TableCell>
                        <TableCell>{apt.clientName}</TableCell>
                        <TableCell>${apt.totalAmount.toFixed(2)}</TableCell>
                        <TableCell>
                          {format(new Date(apt.startTime), 'MMM d, h:mm a')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            <CreditCard className="mr-1 h-3 w-3" />
                            {apt.paymentMethod || 'card'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Manual Link Dialog */}
      <Dialog open={!!selectedMatch} onOpenChange={() => setSelectedMatch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Payment to Appointment</DialogTitle>
            <DialogDescription>
              Manually connect this Helcim transaction to the selected appointment
            </DialogDescription>
          </DialogHeader>
          
          {selectedMatch && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="font-semibold mb-2">Helcim Transaction</div>
                <div className="text-sm space-y-1">
                  <div>Amount: ${selectedMatch.transaction?.amount}</div>
                  <div>Card: ****{selectedMatch.transaction?.cardNumber?.slice(-4)}</div>
                  <div>ID: {selectedMatch.transaction?.transactionId || selectedMatch.transaction?.id}</div>
                </div>
              </div>
              
              <ArrowRight className="mx-auto h-5 w-5 text-gray-400" />
              
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="font-semibold mb-2">Appointment #{selectedMatch.appointment?.id}</div>
                <div className="text-sm space-y-1">
                  <div>Client: {selectedMatch.appointment?.clientId}</div>
                  <div>Amount: ${selectedMatch.appointment?.amount}</div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedMatch(null)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (selectedMatch) {
                  handleManualLink(
                    selectedMatch.transaction.transactionId || selectedMatch.transaction.id,
                    selectedMatch.appointment.id,
                    selectedMatch.transaction.amount,
                    selectedMatch.transaction.cardNumber?.slice(-4)
                  );
                }
              }}
              disabled={isLinking}
            >
              {isLinking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Linking...
                </>
              ) : (
                'Link Payment'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

