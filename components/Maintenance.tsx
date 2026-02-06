
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../store';
import { UserRole, BrandConfig } from '../types';

export const Maintenance: React.FC = () => {
  const { 
    resetOutletData, resetGlobalData, 
    currentUser, outlets, brandConfig, updateBrandConfig,
    exportTableToCSV, resetAttendanceLogs, importCSVToTable,
    cloudConfig, saveCloudConfig, isCloudConnected
  } = useApp();
  
  const [targetOutletId, setTargetOutletId] = useState('');
  const [showOutletResetConfirm, setShowOutletResetConfirm] = useState(false);
  const [showGlobalResetConfirm, setShowGlobalResetConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSQLModal, setShowSQLModal] = useState(false);
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | null }>({ message: '', type: null });

  // Cloud & White-label State
  const [tempBrand, setTempBrand] = useState<BrandConfig>(brandConfig);
  const [tempCloud, setTempCloud] = useState(cloudConfig);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentImportTable, setCurrentImportTable] = useState<string | null>(null);

  useEffect(() => {
    setTempBrand(brandConfig);
  }, [brandConfig]);

  useEffect(() => {
    if (toast.type && toast.type !== 'info') {
      const timer = setTimeout(() => setToast({ message: '', type: null }), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (currentUser?.role !== UserRole.OWNER) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-white">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center text-4xl mb-6 shadow-inner">🚫</div>
        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Akses Terkunci</h3>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">Hanya Owner yang dapat mengakses System Maintenance.</p>
      </div>
    );
  }

  const SQL_SCRIPT = `-- 1. Kategori & Produk
CREATE TABLE categories (id TEXT PRIMARY KEY, name TEXT NOT NULL, "sortOrder" INTEGER DEFAULT 0);
CREATE TABLE products (id TEXT PRIMARY KEY, name TEXT NOT NULL, "categoryId" TEXT REFERENCES categories(id), price NUMERIC DEFAULT 0, image TEXT, bom JSONB DEFAULT '[]', "isAvailable" BOOLEAN DEFAULT true, "isCombo" BOOLEAN DEFAULT false, "comboItems" JSONB DEFAULT '[]', "outletSettings" JSONB DEFAULT '{}');

-- 2. Lokasi & SDM
CREATE TABLE outlets (id TEXT PRIMARY KEY, name TEXT NOT NULL, address TEXT, "openTime" TEXT, "closeTime" TEXT, latitude NUMERIC, longitude NUMERIC);
CREATE TABLE staff (id TEXT PRIMARY KEY, name TEXT NOT NULL, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL, "assignedOutletIds" TEXT[] DEFAULT '{}', status TEXT DEFAULT 'ACTIVE', permissions JSONB, "joinedAt" TIMESTAMPTZ DEFAULT NOW(), "shiftStartTime" TEXT, "shiftEndTime" TEXT, "dailySalesTarget" NUMERIC, phone TEXT, email TEXT, photo TEXT, instagram TEXT, telegram TEXT, tiktok TEXT, "emergencyContactName" TEXT, "emergencyContactPhone" TEXT, address TEXT);

-- 3. Stok & Logistik
CREATE TABLE inventory (id TEXT PRIMARY KEY, "outletId" TEXT REFERENCES outlets(id) ON DELETE CASCADE, name TEXT NOT NULL, unit TEXT, quantity NUMERIC DEFAULT 0, "minStock" NUMERIC DEFAULT 0, "costPerUnit" NUMERIC DEFAULT 0, type TEXT, "isCashierOperated" BOOLEAN DEFAULT false, "canCashierPurchase" BOOLEAN DEFAULT false);
CREATE TABLE wip_recipes (id TEXT PRIMARY KEY, name TEXT NOT NULL, "resultItemId" TEXT, "resultQuantity" NUMERIC, components JSONB DEFAULT '[]', "assignedOutletIds" TEXT[] DEFAULT '{}', "isCashierOperated" BOOLEAN DEFAULT false);
CREATE TABLE production_records (id TEXT PRIMARY KEY, "outletId" TEXT, "resultItemId" TEXT, "resultQuantity" NUMERIC, components JSONB, timestamp TIMESTAMPTZ DEFAULT NOW(), "staffId" TEXT, "staffName" TEXT);
CREATE TABLE purchases (id TEXT PRIMARY KEY, "outletId" TEXT, "inventoryItemId" TEXT, "itemName" TEXT, quantity NUMERIC, "unitPrice" NUMERIC, "totalPrice" NUMERIC, "staffId" TEXT, "staffName" TEXT, timestamp TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE stock_transfers (id TEXT PRIMARY KEY, "fromOutletId" TEXT, "fromOutletName" TEXT, "toOutletId" TEXT, "toOutletName" TEXT, "itemName" TEXT, quantity NUMERIC, unit TEXT, status TEXT, timestamp TIMESTAMPTZ DEFAULT NOW(), "staffId" TEXT, "staffName" TEXT);

-- 4. CRM & Transaksi
CREATE TABLE customers (id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT UNIQUE, points INTEGER DEFAULT 0, "tierId" TEXT, "registeredAt" TIMESTAMPTZ DEFAULT NOW(), "registeredByStaffId" TEXT, "registeredByStaffName" TEXT, "registeredAtOutletId" TEXT);
CREATE TABLE transactions (id TEXT PRIMARY KEY, "outletId" TEXT, "customerId" TEXT, items JSONB NOT NULL, subtotal NUMERIC, total NUMERIC, "totalCost" NUMERIC, "paymentMethod" TEXT, status TEXT, timestamp TIMESTAMPTZ DEFAULT NOW(), "cashierId" TEXT, "cashierName" TEXT, "pointsEarned" INTEGER, "pointsRedeemed" INTEGER, "membershipDiscount" NUMERIC DEFAULT 0, "bulkDiscount" NUMERIC DEFAULT 0);

-- 5. Absensi & Keuangan
CREATE TABLE attendance (id TEXT PRIMARY KEY, "staffId" TEXT, "staffName" TEXT, "outletId" TEXT, date TEXT, "clockIn" TIMESTAMPTZ, "clockOut" TIMESTAMPTZ, status TEXT, latitude NUMERIC, longitude NUMERIC, notes TEXT);
CREATE TABLE leave_requests (id TEXT PRIMARY KEY, "staffId" TEXT, "staffName" TEXT, "outletId" TEXT, "startDate" TIMESTAMPTZ, "endDate" TIMESTAMPTZ, reason TEXT, status TEXT DEFAULT 'PENDING', "requestedAt" TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE expense_types (id TEXT PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE expenses (id TEXT PRIMARY KEY, "outletId" TEXT, "typeId" TEXT, amount NUMERIC, notes TEXT, "staffId" TEXT, "staffName" TEXT, timestamp TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE daily_closings (id TEXT PRIMARY KEY, "outletId" TEXT, "staffId" TEXT, "staffName" TEXT, timestamp TIMESTAMPTZ DEFAULT NOW(), "shiftName" TEXT, "openingBalance" NUMERIC, "totalSalesCash" NUMERIC, "totalSalesQRIS" NUMERIC, "totalExpenses" NUMERIC, "actualCash" NUMERIC, discrepancy NUMERIC, notes TEXT, status TEXT);

-- 6. Config Global
CREATE TABLE loyalty_config (id TEXT PRIMARY KEY, "isEnabled" BOOLEAN, "earningAmountPerPoint" NUMERIC, "redemptionValuePerPoint" NUMERIC, "minRedeemPoints" INTEGER);
CREATE TABLE brand_config (id TEXT PRIMARY KEY, name TEXT, tagline TEXT, "logoUrl" TEXT, "primaryColor" TEXT);
CREATE TABLE membership_tiers (id TEXT PRIMARY KEY, name TEXT, "minPoints" INTEGER, "discountPercent" NUMERIC);
CREATE TABLE bulk_discounts (id TEXT PRIMARY KEY, name TEXT, "minQty" INTEGER, "discountPercent" NUMERIC, "isActive" BOOLEAN, "applicableProductIds" TEXT[]);
CREATE TABLE simulations (id TEXT PRIMARY KEY, name TEXT, price NUMERIC, "shareProfitPercent" NUMERIC, items JSONB, "updatedAt" TIMESTAMPTZ DEFAULT NOW());

-- DATA AWAL OWNER & SISTEM (SAAS READY)
INSERT INTO outlets (id, name, address, "openTime", "closeTime") VALUES ('out1', 'Main Hub', 'District 1', '09:00', '21:00');
INSERT INTO staff (id, name, username, password, role, status, "assignedOutletIds", permissions) 
VALUES ('s1', 'Admin System', 'admin', '123', 'PEMILIK', 'ACTIVE', ARRAY['out1'], '{"canAccessReports":true,"canManageStaff":true,"canManageMenu":true,"canManageInventory":true,"canProcessSales":true,"canVoidTransactions":true,"canManageSettings":true}');
INSERT INTO loyalty_config (id, "isEnabled", "earningAmountPerPoint", "redemptionValuePerPoint", "minRedeemPoints") VALUES ('global', true, 1000, 100, 50);
INSERT INTO brand_config (id, name, tagline, "primaryColor") VALUES ('global', 'Food OS', 'Enterprise Smart Operating System', '#6366f1');
`;

  const copyToClipboard = () => {
     navigator.clipboard.writeText(SQL_SCRIPT);
     setToast({ message: "SQL Berhasil Disalin! Silakan paste di Supabase Editor.", type: 'success' });
  };

  const handleSaveBrand = async () => {
    setIsProcessing(true);
    try {
      await updateBrandConfig(tempBrand);
      setToast({ message: "IDENTITAS BISNIS DIPERBARUI!", type: 'success' });
    } catch (e) {
      setToast({ message: "Gagal menyimpan branding.", type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveCloud = () => {
    if (!tempCloud.url || !tempCloud.key) return alert("URL dan Key wajib diisi!");
    saveCloudConfig(tempCloud.url, tempCloud.key);
    setToast({ message: "DATABASE CONFIG SAVED! RESTARTING...", type: 'success' });
  };

  const handleGlobalWipe = async () => {
     setIsProcessing(true);
     await resetGlobalData();
     setIsProcessing(false);
     setShowGlobalResetConfirm(false);
     setToast({ message: "SISTEM TELAH BERSIH!", type: 'success' });
  };

  const handleBranchWipe = async () => {
     setIsProcessing(true);
     await resetOutletData(targetOutletId);
     setIsProcessing(false);
     setShowOutletResetConfirm(false);
     setToast({ message: "DATA CABANG DIBERSIHKAN!", type: 'success' });
  };

  const triggerImport = (table: string) => {
     setCurrentImportTable(table);
     fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file || !currentImportTable) return;

     setIsProcessing(true);
     setToast({ message: `Mempulihkan Tabel ${currentImportTable.toUpperCase()}...`, type: 'info' });

     const reader = new FileReader();
     reader.onload = async (event) => {
        const csv = event.target?.result as string;
        const success = await importCSVToTable(currentImportTable, csv);
        
        setIsProcessing(false);
        if (success) {
           setToast({ message: `Data ${currentImportTable.toUpperCase()} Berhasil Dipulihkan!`, type: 'success' });
        } else {
           setToast({ message: `Gagal memulihkan ${currentImportTable.toUpperCase()}. Cek format file.`, type: 'error' });
        }
        e.target.value = ''; // Reset input
     };
     reader.readAsText(file);
  };

  const ExportButton = ({ label, table }: { label: string; table: string }) => (
    <div className="flex gap-1">
      <button 
        onClick={() => exportTableToCSV(table)} 
        className="flex-1 py-2.5 px-4 bg-slate-50 text-slate-600 rounded-l-xl font-black text-[9px] uppercase tracking-widest text-left flex justify-between items-center group transition-all hover:bg-slate-900 hover:text-white"
      >
        <span>{label}</span>
        <span className="opacity-0 group-hover:opacity-100 transition-opacity">↓</span>
      </button>
      <button 
        onClick={() => triggerImport(table)}
        className="px-4 bg-slate-100 text-slate-400 rounded-r-xl border-l border-white hover:bg-indigo-500 hover:text-white transition-all text-[10px]"
        title="Restore dari CSV"
      >
        ↑
      </button>
    </div>
  );

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar bg-slate-50 pb-40">
      <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileChange} />

      {toast.type && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[999] animate-in slide-in-from-top-10 duration-500 w-full max-w-sm px-4">
           <div className={`px-6 py-5 rounded-[32px] shadow-2xl flex items-center gap-4 border-2 ${
             toast.type === 'success' ? 'bg-emerald-600 border-emerald-400 text-white' : 
             toast.type === 'error' ? 'bg-rose-600 border-rose-400 text-white' : 'bg-slate-900 text-white'
           }`}>
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl shrink-0">
                {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : '⏳'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-1">System Audit</p>
                <p className="text-[11px] font-bold opacity-90 uppercase leading-tight">{toast.message}</p>
              </div>
           </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
           <div>
              <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">System Maintenance</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Branding, Cloud & Recovery Tools</p>
           </div>
           <button 
            onClick={() => setShowSQLModal(true)}
            className="w-full md:w-auto px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-2"
           >
             ⚡ SETUP DATABASE CLOUD
           </button>
        </div>

        {/* CLOUD DATABASE SETTINGS */}
        <div className="bg-slate-900 p-8 md:p-10 rounded-[48px] border-2 border-indigo-500/20 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
           <div className="flex items-center gap-3 mb-8 relative z-10">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner ${isCloudConnected ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                {isCloudConnected ? '☁️' : '⚠️'}
              </div>
              <div>
                 <h3 className="text-xl font-black text-white uppercase tracking-tight">Cloud Instance Connection</h3>
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                   Status: {isCloudConnected ? <span className="text-emerald-400 font-black">CONNECTED ✓</span> : <span className="text-rose-400 font-black">DISCONNECTED / LOCAL ONLY</span>}
                 </p>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
              <div className="space-y-6">
                 <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase mb-2 block ml-1 tracking-widest">Supabase URL</label>
                    <input 
                      type="text" 
                      className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl font-mono text-[10px] text-indigo-400 focus:border-indigo-500 outline-none" 
                      value={tempCloud.url} 
                      onChange={e => setTempCloud({...tempCloud, url: e.target.value})} 
                      placeholder="https://xxx.supabase.co" 
                    />
                 </div>
              </div>
              <div className="space-y-6">
                 <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase mb-2 block ml-1 tracking-widest">Supabase Anon Key</label>
                    <input 
                      type="password" 
                      className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl font-mono text-[10px] text-indigo-400 focus:border-indigo-500 outline-none" 
                      value={tempCloud.key} 
                      onChange={e => setTempCloud({...tempCloud, key: e.target.value})} 
                      placeholder="eyJhbG..." 
                    />
                 </div>
              </div>
           </div>

           <div className="mt-10 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center gap-6">
              <button 
                onClick={handleSaveCloud}
                className="w-full md:w-auto px-12 py-5 bg-indigo-600 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-500 transition-all active:scale-95"
              >
                SAVE & RECONNECT ⚡
              </button>
              <p className="text-[8px] text-slate-500 uppercase font-black italic max-w-sm text-center md:text-left">Perubahan membutuhkan restart aplikasi otomatis. Pastikan kredensial benar.</p>
           </div>
        </div>

        {/* WHITE LABEL SETTINGS */}
        <div className="bg-white p-8 md:p-10 rounded-[48px] border-2 border-slate-100 shadow-sm overflow-hidden relative">
           <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-2xl shadow-inner" style={{ color: brandConfig.primaryColor }}>🎨</div>
              <div>
                 <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">White-Label Branding</h3>
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Kustomisasi Nama & Logo Perusahaan</p>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                 <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block ml-1">Nama Perusahaan</label>
                    <input type="text" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-slate-900 focus:border-indigo-500 outline-none" value={tempBrand.name} onChange={e => setTempBrand({...tempBrand, name: e.target.value})} placeholder="Contoh: Kopi Teman" />
                 </div>
                 <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block ml-1">Tagline Bisnis</label>
                    <input type="text" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-slate-900 focus:border-indigo-500 outline-none" value={tempBrand.tagline} onChange={e => setTempBrand({...tempBrand, tagline: e.target.value})} placeholder="Contoh: Modern Cafe System" />
                 </div>
              </div>
              <div className="space-y-6">
                 <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block ml-1">Logo URL (PNG/SVG)</label>
                    <input type="text" className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-slate-900 focus:border-indigo-500 outline-none" value={tempBrand.logoUrl} onChange={e => setTempBrand({...tempBrand, logoUrl: e.target.value})} placeholder="https://link-to-your-logo.png" />
                 </div>
                 <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block ml-1">Warna Utama (Hex)</label>
                    <div className="flex gap-4">
                       <input type="color" className="w-16 h-14 bg-transparent cursor-pointer" value={tempBrand.primaryColor} onChange={e => setTempBrand({...tempBrand, primaryColor: e.target.value})} />
                       <input type="text" className="flex-1 p-4 bg-slate-50 border-2 rounded-2xl font-mono font-black text-slate-900 focus:border-indigo-500 outline-none" value={tempBrand.primaryColor} onChange={e => setTempBrand({...tempBrand, primaryColor: e.target.value})} />
                    </div>
                 </div>
              </div>
           </div>

           <div className="mt-10 pt-8 border-t border-slate-50">
              <button 
                disabled={isProcessing}
                onClick={handleSaveBrand}
                className="w-full md:w-auto px-12 py-5 bg-slate-900 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-50"
              >
                {isProcessing ? 'MENYIMPAN...' : 'UPDATE IDENTITAS BISNIS 🚀'}
              </button>
           </div>
        </div>

        {/* DATA MANAGEMENT */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-white p-8 rounded-[40px] border-2 border-slate-100 shadow-sm flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-xl shadow-inner">🏢</div>
                 <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-800">Master Business</h4>
              </div>
              <div className="space-y-2">
                 <ExportButton label="Daftar Cabang" table="outlets" />
                 <ExportButton label="Database Staff" table="staff" />
                 <ExportButton label="Katalog Produk" table="products" />
                 <ExportButton label="Kategori Menu" table="categories" />
                 <ExportButton label="Member CRM" table="customers" />
              </div>
           </div>

           <div className="bg-white p-8 rounded-[40px] border-2 border-slate-100 shadow-sm flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center text-xl shadow-inner">📦</div>
                 <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-800">Supply Chain</h4>
              </div>
              <div className="space-y-2">
                 <ExportButton label="Stok Gudang" table="inventory" />
                 <ExportButton label="Resep WIP" table="wip_recipes" />
                 <ExportButton label="Riwayat Belanja" table="purchases" />
                 <ExportButton label="Log Mutasi" table="stock_transfers" />
              </div>
           </div>

           <div className="bg-white p-8 rounded-[40px] border-2 border-slate-100 shadow-sm flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center text-xl shadow-inner">📈</div>
                 <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-800">Operational Logs</h4>
              </div>
              <div className="space-y-2">
                 <ExportButton label="Semua Transaksi" table="transactions" />
                 <ExportButton label="Biaya Operasional" table="expenses" />
                 <ExportButton label="Rekap Tutup Buku" table="daily_closings" />
                 <ExportButton label="Log Absensi" table="attendance" />
              </div>
           </div>
        </div>

        {/* DANGER ZONE */}
        <div className="pt-10 border-t border-slate-200">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-[32px] border-2 border-orange-100 flex flex-col md:flex-row justify-between items-center gap-4">
                 <div className="text-center md:text-left">
                    <p className="text-[10px] font-black uppercase text-slate-800">Reset Data Cabang</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Wipe seluruh log transaksi per outlet.</p>
                 </div>
                 <div className="flex gap-2 w-full md:w-auto">
                    <select className="flex-1 p-3 bg-slate-50 border rounded-xl text-[10px] font-black uppercase outline-none" value={targetOutletId} onChange={e => setTargetOutletId(e.target.value)}>
                       <option value="">Pilih Cabang</option>
                       {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                    <button disabled={!targetOutletId || isProcessing} onClick={() => setShowOutletResetConfirm(true)} className="px-5 py-3 bg-orange-500 text-white rounded-xl text-[9px] font-black uppercase disabled:opacity-30">WIPE 🧨</button>
                 </div>
              </div>
              
              <div className="bg-white p-6 rounded-[32px] border-2 border-red-100 flex flex-col md:flex-row justify-between items-center gap-4">
                 <div className="text-center md:text-left">
                    <p className="text-[10px] font-black uppercase text-red-600">Factory Reset Global</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Kosongkan seluruh database cloud {brandConfig.name}.</p>
                 </div>
                 <button disabled={isProcessing} onClick={() => setShowGlobalResetConfirm(true)} className="w-full md:w-auto px-10 py-3 bg-red-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg disabled:opacity-30">SYSTEM RESET 🧨</button>
              </div>
           </div>
        </div>
      </div>

      {/* SQL MODAL */}
      {showSQLModal && (
         <div className="fixed inset-0 z-[1000] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="bg-white rounded-[48px] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
               <div className="p-8 border-b border-slate-100 flex justify-between items-center shrink-0">
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Database Cloud Setup</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Copy SQL Script untuk Supabase SQL Editor</p>
                  </div>
                  <button onClick={() => setShowSQLModal(false)} className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 text-xl">✕</button>
               </div>
               <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50">
                  <div className="bg-indigo-50 border-2 border-indigo-100 p-6 rounded-3xl mb-6">
                     <p className="text-[11px] font-black text-indigo-600 uppercase mb-2">Langkah Install:</p>
                     <ol className="text-[10px] text-indigo-900 space-y-2 list-decimal ml-4 font-bold uppercase leading-relaxed">
                        <li>Buka Dashboard Supabase Anda.</li>
                        <li>Pilih menu "SQL Editor" di bilah kiri.</li>
                        <li>Klik "+ New Query".</li>
                        <li>Paste kode di bawah ini, lalu klik "RUN".</li>
                        <li>Setelah selesai, login dengan: admin / 123</li>
                     </ol>
                  </div>
                  <div className="relative">
                     <pre className="w-full p-6 bg-slate-900 text-emerald-400 rounded-3xl text-[10px] font-mono overflow-x-auto h-80 custom-scrollbar shadow-inner leading-relaxed">
                        {SQL_SCRIPT}
                     </pre>
                     <button 
                        onClick={copyToClipboard}
                        className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-black text-[9px] uppercase transition-all"
                     >
                        Copy Code 📋
                     </button>
                  </div>
               </div>
               <div className="p-8 border-t border-slate-100 bg-white shrink-0">
                  <button onClick={copyToClipboard} className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl">SALIN SQL & SELESAI ✅</button>
               </div>
            </div>
         </div>
      )}

      {/* CONFIRMS */}
      {showOutletResetConfirm && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white rounded-[56px] w-full max-w-sm p-12 shadow-2xl text-center animate-in zoom-in-95">
             <div className="text-6xl mb-8">🧹</div>
             <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-4">Reset Cabang?</h3>
             <p className="text-slate-500 text-[10px] font-black uppercase leading-relaxed tracking-widest px-4">Menghapus seluruh transaksi cabang: <span className="text-orange-600">{outlets.find(o=>o.id===targetOutletId)?.name}</span></p>
             <div className="flex flex-col gap-3 mt-12">
                <button disabled={isProcessing} onClick={handleBranchWipe} className="w-full py-6 bg-orange-600 text-white rounded-[28px] font-black text-xs uppercase shadow-xl">IYA, WIPE DATA</button>
                <button onClick={() => setShowOutletResetConfirm(false)} className="w-full py-4 text-slate-400 font-black uppercase text-[10px]">BATAL</button>
             </div>
          </div>
        </div>
      )}

      {showGlobalResetConfirm && (
        <div className="fixed inset-0 z-[1000] bg-red-600/95 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white rounded-[56px] w-full max-w-sm p-12 shadow-2xl text-center animate-in zoom-in-95">
             <div className="text-6xl mb-8">🧨</div>
             <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-4">Factory Reset</h3>
             <p className="text-slate-500 text-[10px] font-black uppercase leading-relaxed tracking-widest px-4">Tindakan ini akan mengosongkan SELURUH isi database cloud (Kecuali Akun Staff).</p>
             <div className="flex flex-col gap-3 mt-12">
                <button disabled={isProcessing} onClick={handleGlobalWipe} className="w-full py-6 bg-red-600 text-white rounded-[28px] font-black text-xs uppercase shadow-xl">NUCLEAR WIPE GLOBAL</button>
                <button onClick={() => setShowGlobalResetConfirm(false)} className="w-full py-4 text-slate-400 font-black uppercase text-[10px]">BATALKAN</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
