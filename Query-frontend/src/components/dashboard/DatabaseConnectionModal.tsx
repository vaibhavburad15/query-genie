import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Database, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_BASE = "http://localhost:8000";

interface DatabaseConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectSuccess: (databaseName: string) => void;
}

interface ConnectionFormData {
  databaseType: string;
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
}

const DatabaseConnectionModal = ({ isOpen, onClose, onConnectSuccess }: DatabaseConnectionModalProps) => {
  const [formData, setFormData] = useState<ConnectionFormData>({
    databaseType: 'mysql',
    host: '127.0.0.1',
    port: '3306',
    user: 'root',
    password: '',
    database: '',
  });
  
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (field: keyof ConnectionFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleConnect = async () => {
    setIsConnecting(true);

    const payload = {
      host: formData.host,
      port: parseInt(formData.port, 10),
      user: formData.user,
      password: formData.password,
      database: formData.database,
    };

    try {
      const response = await fetch(`${API_BASE}/api/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "✅ Connection successful!",
          description: `Connected to the ${formData.database} database.`,
        });
        onConnectSuccess(formData.database);
        onClose();
      } else {
        throw new Error(result.error || 'An unknown error occurred.');
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "❌ Connection Failed",
        description: error.message || 'Check credentials and backend server.',
      });
    } finally {
      setIsConnecting(false);
    }
  };
  
  // ✅ THIS RETURN STATEMENT IS THE FIX
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Connection
          </DialogTitle>
          <DialogDescription>
            Connect to your database to start querying.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="host">Host</Label>
            <Input id="host" value={formData.host} onChange={(e) => handleInputChange('host', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="port">Port</Label>
            <Input id="port" value={formData.port} onChange={(e) => handleInputChange('port', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user">Username</Label>
            <Input id="user" value={formData.user} onChange={(e) => handleInputChange('user', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={formData.password} onChange={(e) => handleInputChange('password', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="database">Database Name</Label>
            <Input id="database" value={formData.database} onChange={(e) => handleInputChange('database', e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isConnecting}>
            Cancel
          </Button>
          <Button onClick={handleConnect} disabled={isConnecting}>
            {isConnecting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Connecting...</>
            ) : (
              <><CheckCircle className="w-4 h-4 mr-2" /> Connect</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { DatabaseConnectionModal };



// import { useState } from 'react';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
// import { Database, Loader2, CheckCircle, Upload } from 'lucide-react';
// import { useToast } from '@/hooks/use-toast';

// // It's a good practice to have a central place for your API calls
// const API_BASE = "http://localhost:8000";

// interface DatabaseConnectionModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   onConnectSuccess: () => void; // A callback for successful connection
// }

// interface ConnectionFormData {
//   databaseType: string;
//   host: string;
//   port: string;
//   user: string;
//   password: string;
//   database: string; // Changed from databaseName to match backend
// }

// export const DatabaseConnectionModal = ({ isOpen, onClose, onConnectSuccess }: DatabaseConnectionModalProps) => {
//   const [formData, setFormData] = useState<ConnectionFormData>({
//     databaseType: '',
//     host: '127.0.0.1', // Default to 127.0.0.1 which is often more reliable
//     port: '',
//     user: 'root',
//     password: '',
//     database: '',
//   });
  
//   const [isConnecting, setIsConnecting] = useState(false);
//   const [errors, setErrors] = useState<Record<string, string>>({});
//   const { toast } = useToast();

//   const databaseOptions = [
//     { value: 'mysql', label: 'MySQL', defaultPort: '3306' },
//     { value: 'postgresql', label: 'PostgreSQL', defaultPort: '5432' },
//     // Add other supported DBs here
//   ];

//   const handleDatabaseChange = (dbType: string) => {
//     const dbOption = databaseOptions.find(opt => opt.value === dbType);
//     setFormData(prev => ({
//       ...prev,
//       databaseType: dbType,
//       port: dbOption?.defaultPort || ''
//     }));
//     setErrors({});
//   };

//   const handleInputChange = (field: keyof ConnectionFormData, value: string) => {
//     setFormData(prev => ({ ...prev, [field]: value }));
//     if (errors[field]) {
//       setErrors(prev => ({ ...prev, [field]: '' }));
//     }
//   };

//   const validateForm = () => {
//     const newErrors: Record<string, string> = {};
//     if (!formData.databaseType) newErrors.databaseType = 'Please select a database type';
//     if (!formData.host.trim()) newErrors.host = 'Host is required';
//     if (!formData.port.trim()) newErrors.port = 'Port is required';
//     if (!/^\d+$/.test(formData.port)) newErrors.port = 'Port must be a number';
//     if (!formData.user.trim()) newErrors.user = 'Username is required';
//     // Password can be optional
//     if (!formData.database.trim()) newErrors.database = 'Database name is required';
    
//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   // ✅ --- THIS IS THE CORRECTED FUNCTION --- ✅
//   const handleConnect = async () => {
//     if (!validateForm()) return;
    
//     setIsConnecting(true);

//     // Prepare the payload to match the backend's Pydantic model
//     const payload = {
//       host: formData.host,
//       port: parseInt(formData.port, 10), // Port must be a number
//       user: formData.user,
//       password: formData.password,
//       database: formData.database, // The key is 'database'
//     };

//     try {
//       const response = await fetch(`${API_BASE}/api/connect`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload)
//       });
      
//       const result = await response.json();

//       if (response.ok && result.success) {
//         // --- SUCCESS ---
//         toast({
//           title: "✅ Connection successful!",
//           description: `Successfully connected to the ${formData.database} database.`,
//         });
//         onConnectSuccess(); // Notify parent component
//         onClose(); // Close the modal
//       } else {
//         // --- FAILURE (controlled by backend) ---
//         throw new Error(result.error || 'An unknown error occurred.');
//       }
//     } catch (error: any) {
//       // --- FAILURE (network error or backend error) ---
//       console.error("Connection failed:", error);
//       toast({
//         variant: "destructive",
//         title: "❌ Connection Failed",
//         description: error.message || 'Please check the backend server and your credentials.',
//       });
//     } finally {
//       setIsConnecting(false);
//     }
//   };
  
//   // (The rest of your component's JSX and helper functions remain the same)
//   // ... renderConnectionFields, Dialog, etc.
// };

// // import { useState } from 'react';
// // import { Button } from '@/components/ui/button';
// // import { Input } from '@/components/ui/input';
// // import { Label } from '@/components/ui/label';
// // import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// // import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
// // import { Database, Loader2, CheckCircle, Upload } from 'lucide-react';
// // import { useToast } from '@/hooks/use-toast';

// // interface DatabaseConnectionModalProps {
// //   isOpen: boolean;
// //   onClose: () => void;
// //   onConnect: (data: any) => void;
// // }

// // interface ConnectionFormData {
// //   database: string;
// //   host: string;
// //   port: string;
// //   user: string;
// //   password: string;
// //   databaseName: string;
// //   excelFile?: File;
// // }

// // const DatabaseConnectionModal = ({ isOpen, onClose, onConnect }: DatabaseConnectionModalProps) => {
// //   const [formData, setFormData] = useState<ConnectionFormData>({
// //     database: '',
// //     host: '',
// //     port: '',
// //     user: '',
// //     password: '',
// //     databaseName: '',
// //     excelFile: undefined
// //   });
  
// //   const [isConnecting, setIsConnecting] = useState(false);
// //   const [errors, setErrors] = useState<Record<string, string>>({});
// //   const { toast } = useToast();

// //   const databaseOptions = [
// //     { value: 'mysql', label: 'MySQL', defaultPort: '3306' },
// //     { value: 'postgresql', label: 'PostgreSQL', defaultPort: '5432' },
// //     { value: 'mongodb', label: 'MongoDB', defaultPort: '27017' },
// //     { value: 'excel', label: 'Excel', defaultPort: '' }
// //   ];

// //   const handleDatabaseChange = (database: string) => {
// //     const dbOption = databaseOptions.find(opt => opt.value === database);
// //     setFormData(prev => ({
// //       ...prev,
// //       database,
// //       port: dbOption?.defaultPort || ''
// //     }));
// //     setErrors({});
// //   };

// //   const handleInputChange = (field: string, value: string) => {
// //     setFormData(prev => ({ ...prev, [field]: value }));
// //     if (errors[field]) {
// //       setErrors(prev => ({ ...prev, [field]: '' }));
// //     }
// //   };

// //   const validateForm = () => {
// //     const newErrors: Record<string, string> = {};
    
// //     if (!formData.database) {
// //       newErrors.database = 'Please select a database type';
// //     }

// //     // Skip validation for Excel
// //     if (formData.database !== 'excel') {
// //       if (!formData.host.trim()) {
// //         newErrors.host = 'Host is required';
// //       }
      
// //       if (!formData.port.trim()) {
// //         newErrors.port = 'Port is required';
// //       } else if (!/^\d+$/.test(formData.port)) {
// //         newErrors.port = 'Port must be a number';
// //       }
      
// //       if (!formData.user.trim()) {
// //         newErrors.user = 'Username is required';
// //       }
      
// //       if (!formData.password) {
// //         newErrors.password = 'Password is required';
// //       }
      
// //       if (!formData.databaseName.trim()) {
// //         newErrors.databaseName = 'Database name is required';
// //       }
// //     }
    
// //     setErrors(newErrors);
// //     return Object.keys(newErrors).length === 0;
// //   };

// //   const handleConnect = async () => {
// //     if (!validateForm()) return;
    
// //     setIsConnecting(true);
    
// //     // Simulate connection attempt
// //     await new Promise(resolve => setTimeout(resolve, 2000));
    
// //     // Mock successful connection
// //     setIsConnecting(false);
// //     onConnect(formData);
// //     toast({
// //       title: "Connection successful!",
// //       description: `Successfully connected to ${formData.database.toUpperCase()} database.`,
// //     });
    
// //     // Reset form and close modal
// //     setFormData({
// //       database: '',
// //       host: '',
// //       port: '',
// //       user: '',
// //       password: '',
// //       databaseName: '',
// //       excelFile: undefined
// //     });
// //     onClose();
// //   };

// //   const handleCancel = () => {
// //     setFormData({
// //       database: '',
// //       host: '',
// //       port: '',
// //       user: '',
// //       password: '',
// //       databaseName: '',
// //       excelFile: undefined
// //     });
// //     setErrors({});
// //     onClose();
// //   };

// //   const renderConnectionFields = () => {
// //     if (!formData.database) {
// //       return (
// //         <div className="text-center py-8">
// //           <Database className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
// //           <p className="text-caption">
// //             Select a database type to see connection options.
// //           </p>
// //         </div>
// //       );
// //     }

// //     if (formData.database === 'mongodb') {
// //       return (
// //         <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
// //           <div className="flex items-center gap-3">
// //             <div className="flex-shrink-0">
// //               <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100">
// //                 <span className="text-amber-600 text-sm font-medium">⏱</span>
// //               </div>
// //             </div>
// //             <div className="flex-1">
// //               <h3 className="text-sm font-medium text-amber-800">Coming Soon</h3>
// //               <p className="text-sm text-amber-700">
// //                 MongoDB connection will be available in a future update.
// //               </p>
// //             </div>
// //           </div>
// //         </div>
// //       );
// //     }

// //     if (formData.database === 'excel') {
// //       return (
// //         <div className="space-y-4">
// //           <div className="space-y-2">
// //             <Label htmlFor="excel-upload" className="text-label">Upload Excel File</Label>
// //             <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-6 text-center hover:border-muted-foreground/40 transition-colors">
// //               <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
// //               <p className="text-sm text-muted-foreground mb-2">
// //                 Click to upload or drag and drop
// //               </p>
// //               <p className="text-xs text-muted-foreground">
// //                 Excel files (.xlsx, .xls)
// //               </p>
// //               <input
// //                 id="excel-upload"
// //                 type="file"
// //                 accept=".xlsx,.xls"
// //                 className="hidden"
// //                 onChange={(e) => {
// //                   const file = e.target.files?.[0];
// //                   if (file) {
// //                     setFormData(prev => ({ ...prev, excelFile: file }));
// //                   }
// //                 }}
// //               />
// //               <Button
// //                 type="button"
// //                 variant="outline"
// //                 className="mt-3"
// //                 onClick={() => document.getElementById('excel-upload')?.click()}
// //               >
// //                 Choose File
// //               </Button>
// //             </div>
// //             {formData.excelFile && (
// //               <div className="text-sm text-muted-foreground">
// //                 Selected: {formData.excelFile.name}
// //               </div>
// //             )}
// //           </div>
// //         </div>
// //       );
// //     }

// //     return (
// //       <div className="space-y-4">
// //         {/* Host */}
// //         <div className="space-y-2">
// //           <Label htmlFor="host" className="text-label">Host</Label>
// //           <Input
// //             id="host"
// //             value={formData.host}
// //             onChange={(e) => handleInputChange('host', e.target.value)}
// //             placeholder="localhost or IP address"
// //             className={`focus-brand ${errors.host ? 'border-destructive' : ''}`}
// //             disabled={isConnecting}
// //           />
// //           {errors.host && (
// //             <p className="text-sm text-destructive animate-in">{errors.host}</p>
// //           )}
// //         </div>

// //         {/* Port */}
// //         <div className="space-y-2">
// //           <Label htmlFor="port" className="text-label">Port</Label>
// //           <Input
// //             id="port"
// //             value={formData.port}
// //             onChange={(e) => handleInputChange('port', e.target.value)}
// //             placeholder="Database port"
// //             className={`focus-brand ${errors.port ? 'border-destructive' : ''}`}
// //             disabled={isConnecting}
// //           />
// //           {errors.port && (
// //             <p className="text-sm text-destructive animate-in">{errors.port}</p>
// //           )}
// //         </div>

// //         {/* User */}
// //         <div className="space-y-2">
// //           <Label htmlFor="user" className="text-label">Username</Label>
// //           <Input
// //             id="user"
// //             value={formData.user}
// //             onChange={(e) => handleInputChange('user', e.target.value)}
// //             placeholder="Database username"
// //             className={`focus-brand ${errors.user ? 'border-destructive' : ''}`}
// //             disabled={isConnecting}
// //           />
// //           {errors.user && (
// //             <p className="text-sm text-destructive animate-in">{errors.user}</p>
// //           )}
// //         </div>

// //         {/* Password */}
// //         <div className="space-y-2">
// //           <Label htmlFor="password" className="text-label">Password</Label>
// //           <Input
// //             id="password"
// //             type="password"
// //             value={formData.password}
// //             onChange={(e) => handleInputChange('password', e.target.value)}
// //             placeholder="Database password"
// //             className={`focus-brand ${errors.password ? 'border-destructive' : ''}`}
// //             disabled={isConnecting}
// //           />
// //           {errors.password && (
// //             <p className="text-sm text-destructive animate-in">{errors.password}</p>
// //           )}
// //         </div>

// //         {/* Database Name */}
// //         <div className="space-y-2">
// //           <Label htmlFor="databaseName" className="text-label">Database Name</Label>
// //           <Input
// //             id="databaseName"
// //             value={formData.databaseName}
// //             onChange={(e) => handleInputChange('databaseName', e.target.value)}
// //             placeholder="Name of the database"
// //             className={`focus-brand ${errors.databaseName ? 'border-destructive' : ''}`}
// //             disabled={isConnecting}
// //           />
// //           {errors.databaseName && (
// //             <p className="text-sm text-destructive animate-in">{errors.databaseName}</p>
// //           )}
// //         </div>
// //       </div>
// //     );
// //   };

// //   return (
// //     <Dialog open={isOpen} onOpenChange={onClose}>
// //       <DialogContent className="sm:max-w-md glass-elevated">
// //         <DialogHeader>
// //           <DialogTitle className="flex items-center gap-2">
// //             <Database className="h-5 w-5 text-brand-600" />
// //             Database Connection
// //           </DialogTitle>
// //           <DialogDescription>
// //             Connect to your database to start querying with natural language.
// //           </DialogDescription>
// //         </DialogHeader>

// //         <div className="space-y-6">
// //           {/* Database Selection */}
// //           <div className="space-y-2">
// //             <Label htmlFor="database" className="text-label">Select Database</Label>
// //             <Select 
// //               value={formData.database} 
// //               onValueChange={handleDatabaseChange}
// //               disabled={isConnecting}
// //             >
// //               <SelectTrigger className={`focus-brand ${errors.database ? 'border-destructive' : ''}`}>
// //                 <SelectValue placeholder="Choose database type" />
// //               </SelectTrigger>
// //               <SelectContent>
// //                 {databaseOptions.map((option) => (
// //                   <SelectItem key={option.value} value={option.value}>
// //                     {option.label}
// //                   </SelectItem>
// //                 ))}
// //               </SelectContent>
// //             </Select>
// //             {errors.database && (
// //               <p className="text-sm text-destructive animate-in">{errors.database}</p>
// //             )}
// //           </div>

// //           {/* Dynamic Connection Fields */}
// //           {renderConnectionFields()}

// //           {/* Action Buttons */}
// //           <div className="flex gap-3 pt-4">
// //             <Button
// //               variant="outline"
// //               onClick={handleCancel}
// //               disabled={isConnecting}
// //               className="flex-1"
// //             >
// //               Cancel
// //             </Button>
            
// //             <Button
// //               onClick={handleConnect}
// //               disabled={!formData.database || (formData.database === 'excel' && !formData.excelFile) || formData.database === 'mongodb' || isConnecting}
// //               className="flex-1 gradient-brand hover:shadow-brand transition-all duration-200"
// //             >
// //               {isConnecting ? (
// //                 <>
// //                   <Loader2 className="w-4 h-4 mr-2 animate-spin" />
// //                   Connecting...
// //                 </>
// //               ) : (
// //                 <>
// //                   <CheckCircle className="w-4 h-4 mr-2" />
// //                   Connect
// //                 </>
// //               )}
// //             </Button>
// //           </div>
// //         </div>
// //       </DialogContent>
// //     </Dialog>
// //   );
// // };

// // export default DatabaseConnectionModal;
