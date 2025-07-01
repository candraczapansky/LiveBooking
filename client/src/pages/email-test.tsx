import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Mail, AlertCircle, CheckCircle } from 'lucide-react';

export default function EmailTestPage() {
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Test Email from Glo Head Spa');
  const [content, setContent] = useState('This is a test email to verify delivery. If you receive this, your email system is working correctly!');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const sendTestEmail = async () => {
    if (!email || !subject || !content) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/test-email', {
        to: email,
        subject,
        content
      });
      
      setResult(response);
      toast({
        title: "Test Email Sent",
        description: `Email sent to ${email}. Check inbox and spam folder.`,
      });
    } catch (error: any) {
      console.error('Test email error:', error);
      toast({
        title: "Email Failed",
        description: error.message || "Failed to send test email",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Mail className="w-8 h-8" />
          Email Delivery Test
        </h1>
        <p className="text-muted-foreground mt-2">
          Test your SendGrid email configuration and delivery
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Send Test Email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Recipient Email</label>
            <Input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Subject</label>
            <Input
              placeholder="Email subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Content</label>
            <Textarea
              placeholder="Email content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
            />
          </div>

          <Button 
            onClick={sendTestEmail} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Sending...' : 'Send Test Email'}
          </Button>

          {result && (
            <Alert className={result.success ? "border-green-500" : "border-red-500"}>
              {result.success ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              <AlertDescription>
                <div className="font-medium mb-2">
                  {result.success ? 'Email Sent Successfully' : 'Email Failed'}
                </div>
                <div className="text-sm">
                  {result.message}
                </div>
                {result.details && (
                  <div className="text-sm mt-2 text-muted-foreground">
                    {result.details}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-2">Email Delivery Tips:</div>
              <ul className="text-sm space-y-1">
                <li>• Check your spam/junk folder</li>
                <li>• In Gmail, check the Promotions tab</li>
                <li>• Email delivery may take a few minutes</li>
                <li>• Verify your sender email is authenticated in SendGrid</li>
                <li>• New SendGrid accounts may have delivery delays</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}