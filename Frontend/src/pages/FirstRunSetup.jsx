import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Building2, User, Mail, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function FirstRunSetup() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    companyName: '',
    adminEmail: '',
    adminPassword: '',
    firstName: '',
    lastName: ''
  });
  const { setup } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    API.get('/auth/check-setup').then(res => {
      if (!res.data.needsSetup) {
        navigate('/login');
      }
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    try {
      await setup(formData);
      toast.success('Setup completed successfully!');
      navigate('/admin');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Setup failed');
    }
  };

  const steps = [
    { id: 1, title: 'Company', icon: Building2 },
    { id: 2, title: 'Admin Account', icon: User },
    { id: 3, title: 'Confirm', icon: CheckCircle2 },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 px-4">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30 mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">HCM Lite</h1>
          <p className="text-gray-600">Initial Setup Wizard</p>
        </div>

        <div className="flex items-center justify-between mb-8">
          {steps.map((s, idx) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
                step >= s.id ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg' : 'bg-white text-gray-400 border-2 border-gray-200'
              }`}>
                <s.icon className="w-5 h-5" />
              </div>
              {idx < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-3 ${step > s.id ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-blue-500/10 border border-white/20 overflow-hidden">
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">Company Details</h2>
                    <p className="text-gray-500">Tell us about your organization</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Company Name *</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="e.g., Saylani Welfare Trust"
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                        value={formData.companyName}
                        onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">Administrator Account</h2>
                    <p className="text-gray-500">Create your admin login credentials</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">First Name</label>
                      <input
                        type="text"
                        placeholder="John"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                        value={formData.firstName}
                        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Last Name</label>
                      <input
                        type="text"
                        placeholder="Doe"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                        value={formData.lastName}
                        onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Email Address *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        placeholder="admin@company.com"
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                        value={formData.adminEmail}
                        onChange={(e) => setFormData({...formData, adminEmail: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Password *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="password"
                        placeholder="Create a strong password"
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                        value={formData.adminPassword}
                        onChange={(e) => setFormData({...formData, adminPassword: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">Review & Confirm</h2>
                    <p className="text-gray-500">Verify your setup details</p>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <p className="text-xs font-medium text-blue-600 mb-1">COMPANY</p>
                      <p className="text-lg font-semibold text-gray-900">{formData.companyName || '-'}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <p className="text-xs font-medium text-gray-600 mb-2">ADMINISTRATOR</p>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-900"><span className="text-gray-500">Name:</span> {formData.firstName} {formData.lastName}</p>
                        <p className="text-sm text-gray-900"><span className="text-gray-500">Email:</span> {formData.adminEmail}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium"
                  >
                    Back
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 font-medium"
                >
                  {step === 3 ? 'Complete Setup' : 'Continue'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
        <p className="text-center text-sm text-gray-500 mt-6">Powered by HCM Lite</p>
      </div>
    </div>
  );
}
