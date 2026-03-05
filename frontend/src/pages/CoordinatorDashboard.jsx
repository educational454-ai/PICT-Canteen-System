import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, FileSpreadsheet, LogOut, Search, Download, Mail, Trash2, Plus, X, RotateCcw, BarChart3, Calendar, FileText, Ticket } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import API from '../api/axios';

const CoordinatorDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('activeCoordinatorTab') || 'faculty');
  const [faculty, setFaculty] = useState([]);
  const [guests, setGuests] = useState([]); 
  const [orders, setOrders] = useState([]); 
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  
  // This state now controls BOTH the Excel upload override AND the table filter
  const [yearScope, setYearScope] = useState('');
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const fileInputRef = useRef(null);

  const deptId = sessionStorage.getItem('deptId');
  const deptCode = sessionStorage.getItem('deptCode');

  const [formData, setFormData] = useState({ 
      fullName: '', email: '', mobile: '', academicYear: '2025-26',
      validFrom: new Date().toISOString().split('T')[0], 
      validTill: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0] 
  });

  const [guestFormData, setGuestFormData] = useState({
    guestName: '', facultyVoucher: '',
    validFrom: new Date().toISOString().split('T')[0], 
    validTill: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    sessionStorage.setItem('activeCoordinatorTab', activeTab);
  }, [activeTab]);

  useEffect(() => { 
    if (deptId) {
      fetchFaculty(); 
      fetchOrders(); 
      fetchGuests();
    }
  }, [deptId]);

  const fetchFaculty = async () => {
    try { const res = await API.get(`/faculty/department/${deptId}`); setFaculty(res.data); } 
    catch (err) { console.error("Error", err); }
  };

  const fetchGuests = async () => {
    try { const res = await API.get(`/guests/department/${deptId}`); setGuests(res.data); } 
    catch (err) { console.error("Error fetching guests", err); }
  };

  const fetchOrders = async () => {
    try { const res = await API.get(`/orders/department/${deptId}`); setOrders(res.data); } 
    catch (err) { console.error("Error fetching orders", err); }
  };

  const totalExaminers = faculty.length;
  const now = new Date();
  const activeVouchers = faculty.filter(f => {
    const validFrom = new Date(f.validFrom);
    const validTill = new Date(f.validTill);
    return now >= validFrom && now <= validTill;
  }).length;
  const pendingExpired = totalExaminers - activeVouchers;

  const filteredOrders = orders.filter(order => {
    if (!startDate && !endDate) return true;
    const orderDate = new Date(order.orderDate || order.createdAt);
    orderDate.setHours(0, 0, 0, 0);

    const start = startDate ? new Date(startDate) : new Date('2000-01-01');
    const end = endDate ? new Date(endDate) : new Date('2100-01-01');
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return orderDate >= start && orderDate <= end;
  });

  const totalSpent = filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0);
  const totalOrders = filteredOrders.length;

  const handleExportCSV = () => {
    const exportData = faculty.map(f => ({
      "Faculty Name": f.fullName, "Email": f.email, "Mobile": f.mobile, "Year Scope": f.academicYear,
      "Voucher Code": f.voucherCode, "Valid From": new Date(f.validFrom).toLocaleDateString(), "Valid Till": new Date(f.validTill).toLocaleDateString()
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Faculty");
    XLSX.writeFile(workbook, `${deptCode}_Faculty_Vouchers.xlsx`);
  };

  const handleExportReportsCSV = () => {
    const exportData = filteredOrders.map(o => ({
      "Date": new Date(o.orderDate || o.createdAt).toLocaleDateString(),
      "Time": new Date(o.orderDate || o.createdAt).toLocaleTimeString(),
      "Examiner Name": o.facultyId?.fullName || "Deleted User",
      "Voucher Code": o.facultyId?.voucherCode || "N/A",
      "Items Ordered": o.items.map(i => `${i.itemName} (x${i.quantity})`).join(', '),
      "Amount (₹)": o.totalAmount
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
    XLSX.writeFile(workbook, `${deptCode}_Canteen_Usage_Report.xlsx`);
  };

  const generatePDFInvoice = () => {
    const doc = new jsPDF();
    const img = new Image();
    img.src = '/image1.jpeg'; 
    
    img.onload = () => {
      doc.setGState(new doc.GState({ opacity: 0.1 }));
      doc.addImage(img, 'JPEG', 35, 70, 140, 140);
      doc.setGState(new doc.GState({ opacity: 1.0 })); 

      doc.addImage(img, 'JPEG', 14, 10, 22, 22);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("SCTR'S PUNE INSTITUTE OF COMPUTER TECHNOLOGY", 42, 18);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text("Office of the Mess & Canteen Section", 42, 24);

      doc.rect(55, 30, 100, 8);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("DEPARTMENT-WISE BILLING REPORT", 62, 36);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const refNo = `Ref No: PICT/CNTN/${new Date().getFullYear()}/${deptCode}-01`;
      const dateRangeText = `Date: ${startDate ? new Date(startDate).toLocaleDateString('en-GB') : 'All'} to ${endDate ? new Date(endDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')}`;
      
      doc.text(refNo, 14, 50);
      doc.text(dateRangeText, 140, 50);
      doc.setFont("helvetica", "bold");
      doc.text(`Department: ${deptCode} DEPARTMENT`, 14, 58);

      const facultyTotals = {};
      filteredOrders.forEach(order => {
          const name = order.facultyId?.fullName || 'Deleted/Unknown User';
          if (!facultyTotals[name]) facultyTotals[name] = { items: [], total: 0 };
          facultyTotals[name].total += order.totalAmount;
          facultyTotals[name].items.push(order.items.map(i => `${i.itemName}(x${i.quantity})`).join(', '));
      });

      const tableData = Object.keys(facultyTotals).map((name, index) => [
          index + 1,
          name,
          facultyTotals[name].items.join(' | '),
          `Rs. ${facultyTotals[name].total}`
      ]);

      doc.setFontSize(11);
      doc.text("SECTION A: FACULTY CONSUMPTION", 14, 70);
      
      autoTable(doc, {
        startY: 73,
        head: [['Sr', 'Faculty Name', 'Items Consumed', 'Total (Rs)']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [50, 50, 50] },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: { 0: { halign: 'center', cellWidth: 15 }, 3: { halign: 'right', cellWidth: 30 } }
      });

      const finalY = doc.lastAutoTable.finalY;

      doc.setFont("helvetica", "bold");
      doc.text(`Sub-Total (Faculty): Rs. ${totalSpent}/-`, 140, finalY + 8);
      
      doc.rect(130, finalY + 15, 66, 10);
      doc.setFontSize(12);
      doc.text(`GRAND TOTAL`, 135, finalY + 22);
      doc.text(`Rs. ${totalSpent}`, 175, finalY + 22);

      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      
      doc.line(20, pageHeight - 45, 60, pageHeight - 45);
      doc.text("MESS MANAGER", 25, pageHeight - 39);
      doc.line(85, pageHeight - 45, 135, pageHeight - 45);
      doc.text("PRACTICAL COORDINATOR", 87, pageHeight - 39);
      doc.line(160, pageHeight - 45, 200, pageHeight - 45);
      doc.text("HEAD OF DEPARTMENT", 162, pageHeight - 39);
      
      doc.line(45, pageHeight - 20, 85, pageHeight - 20);
      doc.text("CEO", 60, pageHeight - 14);
      doc.line(135, pageHeight - 20, 175, pageHeight - 20);
      doc.text("PRINCIPAL", 148, pageHeight - 14);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text("SYSTEM GENERATED REPORT | PICT CANTEEN & MESS SECTION", 65, pageHeight - 5);

      doc.save(`${deptCode}_Billing_Report.pdf`);
    };

    img.onerror = () => {
        alert("Failed to load watermark image. Check if image1.jpeg exists in the public folder.");
    };
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to revoke this voucher and remove the examiner?")) {
      try { await API.delete(`/faculty/remove/${id}`); fetchFaculty(); } 
      catch (err) { alert("Failed to delete."); }
    }
  };

  const handleResetSystem = async () => {
     if(window.confirm(`WARNING: This will deactivate ALL faculty records for ${deptCode}. Are you absolutely sure?`)) {
         try { await API.delete(`/faculty/department/${deptId}/reset`); setFaculty([]); alert(`All faculty records for ${deptCode} have been cleared.`);} 
         catch (err) { alert("Failed to reset system."); }
     }
  };

  const handleSendEmail = (member) => {
    const subject = encodeURIComponent("Confidential: Your PICT Canteen Examination Voucher");
    const body = encodeURIComponent(`Dear Prof. ${member.fullName},\n\nYOUR SECURE ACCESS CODE: ${member.voucherCode}\nVALIDITY PERIOD ENDS: ${new Date(member.validTill).toLocaleDateString()}\n\nBest Regards,\n${deptCode} Department Coordinator`);
    window.location.href = `mailto:${member.email}?subject=${subject}&body=${body}`;
  };

  const handleAddSingle = async (e) => {
    e.preventDefault();
    if (!deptId || !deptCode) {
        alert("Authentication Error: Department ID is missing. Please log out and log back in.");
        return;
    }

    try {
      await API.post('/faculty/add', { ...formData, departmentId: deptId, deptCode: deptCode });
      setIsModalOpen(false);
      setFormData({ fullName: '', email: '', mobile: '', academicYear: '2025-26', validFrom: new Date().toISOString().split('T')[0], validTill: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0] });
      fetchFaculty();
    } catch (err) { alert("Failed to add faculty."); }
  };

  const handleAddGuest = async (e) => {
    e.preventDefault();
    try {
        const res = await API.post('/guests/add', guestFormData);
        alert(`Success! Guest Code is: ${res.data.voucher}`);
        setIsGuestModalOpen(false);
        setGuestFormData({ guestName: '', facultyVoucher: '', validFrom: new Date().toISOString().split('T')[0], validTill: new Date().toISOString().split('T')[0] });
        fetchGuests();
    } catch (err) { alert(`Failed to add guest: ${err.response?.data?.error || err.message}`); }
  };

  const handleFileUpload = (e) => { 
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
      const rawData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      const facultyMap = new Map();

      rawData.forEach(row => {
        const rawName = row['Internal Examiner'] || "";
        if (!rawName) return; 
        const cleanedName = rawName.includes('-') ? rawName.split('-')[1].trim() : rawName;
        const mobile = String(row['Mobile No.'] || "").trim();
        const fromDate = new Date(row['From Date'] || new Date());
        const tillDate = new Date(row['End Date'] || new Date());
        const extractedYear = row['Pattern Name']?.includes('(') ? row['Pattern Name'].split('(')[1].substring(0, 4) : "2025-26";
        
        // IMPORTANT: Uses the dropdown filter variable (yearScope) if selected, otherwise defaults to Excel data
        const finalYearScope = yearScope !== '' ? yearScope : extractedYear;

        if (facultyMap.has(mobile)) {
          const existing = facultyMap.get(mobile);
          if (fromDate < existing.validFrom) existing.validFrom = fromDate;
          if (tillDate > existing.validTill) existing.validTill = tillDate;
          existing.academicYear = finalYearScope; 
        } else {
          facultyMap.set(mobile, { fullName: cleanedName, email: `${cleanedName.replace(/\s+/g, '.').toLowerCase()}@pict.edu`, mobile: mobile, academicYear: finalYearScope, departmentId: deptId, validFrom: fromDate, validTill: tillDate });
        }
      });

      const formattedData = Array.from(facultyMap.values());
      try {
        const res = await API.post('/faculty/bulk-add', formattedData);
        alert(`Success! Added ${res.data.added} new examiners and extended ${res.data.extended} existing vouchers.`);
        fetchFaculty(); 
        if(fileInputRef.current) fileInputRef.current.value = ""; 
      } catch (err) { 
        console.error("Upload Error:", err.response?.data || err);
        const errorMessage = err.response?.data?.details || err.response?.data?.error || err.message;
        alert(`Upload Failed: ${errorMessage}`); 
      }
    };
    reader.readAsBinaryString(file);
  };

  // --- NEW: STRICT DUAL FILTER LOGIC ---
  const filteredFaculty = faculty.filter(f => {
      // 1. Search Filter (Checks Name, Code, and Email)
      const matchesSearch = f.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            f.voucherCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (f.email && f.email.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // 2. Year Scope Filter (Matches exactly to dropdown, ignores if dropdown is empty)
      const matchesYear = yearScope === '' || f.academicYear === yearScope;

      return matchesSearch && matchesYear;
  });

return (
    <div className="flex min-h-screen bg-[#f8f9fc] relative font-sans h-screen overflow-hidden">
      {/* SIDEBAR */}
      <div className="w-64 bg-[#0a1128] text-white flex flex-col shadow-2xl z-10 shrink-0">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-bold italic tracking-wider text-blue-400">PICT EXAM PORTAL</h2>
        </div>
        <nav className="flex-1 p-4 space-y-2 mt-4">
          <button onClick={() => setActiveTab('faculty')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeTab === 'faculty' ? 'bg-blue-600/20 text-blue-400 shadow-inner-sm' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
            <Users size={20} /> Faculty Management
          </button>
          <button onClick={() => setActiveTab('guests')}className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeTab === 'guests' ? 'bg-blue-600/20 text-blue-400 shadow-inner-sm' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
            <Ticket size={20} /> Guest Vouchers
          </button>
          <button className="w-full flex items-center gap-3 p-3 rounded-xl font-bold text-gray-500 cursor-not-allowed opacity-50" title="Coming Soon">
            <Calendar size={20} /> Exam Schedule
          </button>
          <button onClick={() => setActiveTab('reports')} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeTab === 'reports' ? 'bg-blue-600/20 text-blue-400 shadow-inner-sm' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
            <BarChart3 size={20} /> Reports & Logs
          </button>
        </nav>
        <button onClick={() => { sessionStorage.clear(); navigate('/'); }} className="p-6 text-gray-400 hover:text-white flex items-center gap-3 border-t border-white/10 transition-colors">
          <LogOut size={20} /> Logout
        </button>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* ================= FACULTY TAB ================= */}
        {activeTab === 'faculty' && (
          <>
            <header className="bg-white p-4 px-8 border-b flex justify-between items-center shadow-sm z-10 shrink-0">
              <h1 className="text-2xl font-bold text-gray-800">Faculty Overview</h1>
              <div className="flex gap-3">
                <button onClick={handleExportCSV} className="px-4 py-2 border-2 border-blue-100 rounded-lg text-sm font-bold flex items-center gap-2 text-blue-600 hover:bg-blue-50 transition-all"><Download size={18} /> Export CSV</button>
                <button onClick={handleResetSystem} className="px-4 py-2 border-2 border-red-100 bg-red-50 text-red-600 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-red-100 transition-all"><RotateCcw size={18} /> Reset System</button>
              </div>
            </header>

            <main className="flex-1 flex flex-col p-8 gap-6 overflow-hidden">
               {/* Stats & Search Bar */}
               <div className="grid grid-cols-3 gap-6 shrink-0">
                <div className="bg-white p-6 rounded-2xl border shadow-sm"><p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Examiners</p><h3 className="text-3xl font-black text-gray-800">{totalExaminers}</h3></div>
                <div className="bg-white p-6 rounded-2xl border border-green-100 shadow-sm"><p className="text-[11px] font-bold text-green-600 uppercase tracking-widest mb-1">Active Vouchers</p><h3 className="text-3xl font-black text-green-600">{activeVouchers}</h3></div>
                <div className="bg-white p-6 rounded-2xl border border-orange-100 shadow-sm"><p className="text-[11px] font-bold text-orange-500 uppercase tracking-widest mb-1">Pending / Expired</p><h3 className="text-3xl font-black text-orange-500">{pendingExpired}</h3></div>
              </div>

              <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-wrap gap-4 items-center justify-between shrink-0">
                <div className="relative flex-1 min-w-[300px]">
                  <Search className="absolute left-4 top-3.5 text-gray-400" size={18} />
                  <input type="text" placeholder="Search by Name, Code or Email..." className="w-full pl-12 pr-4 py-2.5 border-2 border-gray-100 rounded-xl outline-none focus:border-blue-500 transition-all text-sm" onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div className="flex gap-3">
                  <select className="px-4 py-2.5 border-2 border-gray-100 rounded-xl text-gray-600 text-sm font-bold outline-none focus:border-blue-500 hover:bg-gray-50 bg-white" value={yearScope} onChange={(e) => setYearScope(e.target.value)}>
                    <option value="">All Years (Extract on Upload)</option>
                    <option value="2nd Yr (Regular)">2nd Yr (Regular)</option>
                    <option value="2nd Yr (Backlog)">2nd Yr (Backlog)</option>
                    <option value="3rd Yr (Regular)">3rd Yr (Regular)</option>
                    <option value="3rd Yr (Backlog)">3rd Yr (Backlog)</option>
                    <option value="4th Yr (Regular)">4th Yr (Regular)</option>
                  </select>
                  <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
                  <button onClick={() => fileInputRef.current.click()} className="px-4 py-2.5 border-2 border-yellow-100 rounded-xl text-sm font-bold flex items-center gap-2 text-yellow-700 bg-yellow-50 hover:bg-yellow-100 transition-all"><FileSpreadsheet size={16} /> Upload File</button>
                  <button className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 flex items-center gap-2 hover:bg-blue-700 transition-all" onClick={() => setIsModalOpen(true)}><Plus size={18} /> New Faculty</button>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-2xl border shadow-sm flex-1 overflow-y-auto relative">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-white/95 backdrop-blur-sm border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-widest sticky top-0 z-10 shadow-sm">
                    <tr><th className="p-4 pl-8">Faculty Details</th><th className="p-4 text-center">Year Scope</th><th className="p-4 text-center">Access Code</th><th className="p-4 text-center">Validity Period</th><th className="p-4 text-center pr-8">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-sm">
                    {filteredFaculty.map((f) => (
                      <tr key={f._id} className="hover:bg-gray-50/50 transition-all group">
                        <td className="p-4 pl-8"><p className="font-bold text-gray-800 text-sm mb-0.5">{f.fullName}</p><p className="text-[11px] text-gray-400 font-medium">{f.email} • {f.mobile}</p></td>
                        <td className="p-4 text-center"><span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">{f.academicYear}</span></td>
                        <td className="p-4 text-center"><span className="font-mono font-bold text-blue-600 bg-blue-50/50 px-3 py-1 rounded-md text-[11px] tracking-wider">{f.voucherCode}</span></td>
                        <td className="p-4 text-center text-[11px] text-gray-500 font-semibold">{new Date(f.validFrom).toLocaleDateString('en-GB')} — {new Date(f.validTill).toLocaleDateString('en-GB')}</td>
                        <td className="p-4 pr-8 flex justify-center gap-3">
                          <button onClick={() => handleSendEmail(f)} className="p-1.5 border border-gray-200 rounded text-gray-300 hover:text-blue-600 hover:border-blue-300 transition-all bg-white shadow-sm" title="Send Email"><Mail size={16} /></button>
                          <button onClick={() => handleDelete(f._id)} className="p-1.5 border border-gray-200 rounded text-gray-300 hover:text-red-500 hover:border-red-300 transition-all bg-white shadow-sm" title="Revoke Voucher"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </main>
          </>
        )}

        {/* ================= GUESTS TAB ================= */}
        {activeTab === 'guests' && (
          <>
            <header className="bg-white p-4 px-8 border-b flex justify-between items-center shadow-sm z-10 shrink-0">
              <h1 className="text-2xl font-bold text-gray-800">Guest Vouchers</h1>
              <button onClick={() => setIsGuestModalOpen(true)} className="px-6 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-purple-700 transition-all shadow-lg shadow-purple-200">
                <Plus size={18} /> New Guest Pass
              </button>
            </header>

            <main className="flex-1 flex flex-col p-8 gap-6 overflow-hidden">
              <div className="bg-white rounded-2xl border shadow-sm flex-1 overflow-y-auto relative">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-white/95 backdrop-blur-sm border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-widest sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="p-4 pl-8">Guest Details</th>
                      <th className="p-4">Host Faculty (Added By)</th>
                      <th className="p-4 text-center">Access Code</th>
                      <th className="p-4 text-center">Validity Period</th>
                      <th className="p-4 text-center pr-8">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-sm">
                    {guests.length === 0 ? (
                      <tr><td colSpan="5" className="text-center p-8 text-gray-400">No guests have been added for this department yet.</td></tr>
                    ) : (
                      guests.map((g) => (
                        <tr key={g._id} className="hover:bg-gray-50/50 transition-all group">
                          <td className="p-4 pl-8">
                            <p className="font-bold text-gray-800 text-sm mb-0.5">{g.guestName}</p>
                            <p className="text-[11px] text-gray-400 font-medium">Guest of {deptCode}</p>
                          </td>
                          <td className="p-4"><span className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-md text-[11px] font-bold">{g.facultyId?.fullName || <span className="text-red-400 italic">Deleted User</span>}</span></td>
                          <td className="p-4 text-center"><span className="font-mono font-bold text-purple-600 bg-purple-50/50 px-3 py-1 rounded-md text-[11px] tracking-wider">{g.voucherCode}</span></td>
                          <td className="p-4 text-center text-[11px] text-gray-500 font-semibold">{new Date(g.validFrom).toLocaleDateString('en-GB')} — {new Date(g.validTill).toLocaleDateString('en-GB')}</td>
                          <td className="p-4 text-center pr-8">
                            {new Date() > new Date(g.validTill) || !g.isActive ? (
                              <span className="text-red-500 bg-red-50 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">Expired</span>
                            ) : (
                              <span className="text-green-500 bg-green-50 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">Active</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </main>
          </>
        )}

        {/* ================= REPORTS TAB ================= */}
        {activeTab === 'reports' && (
          <>
            <header className="bg-white p-4 px-8 border-b flex justify-between items-center shadow-sm z-10 shrink-0">
              <h1 className="text-2xl font-bold text-gray-800">Canteen Usage Logs</h1>
              <div className="flex gap-3">
                 <div className="flex items-center gap-2 mr-4 border-r pr-6 border-gray-200">
                    <span className="text-xs font-bold text-gray-400 uppercase">From:</span>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-sm p-2 border rounded-lg text-gray-600 outline-none focus:border-blue-500" />
                    <span className="text-xs font-bold text-gray-400 uppercase ml-2">To:</span>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-sm p-2 border rounded-lg text-gray-600 outline-none focus:border-blue-500" />
                 </div>
                <button onClick={handleExportReportsCSV} className="px-4 py-2 border-2 border-gray-100 rounded-lg text-sm font-bold flex items-center gap-2 text-gray-600 hover:bg-gray-50 transition-all"><Download size={18} /> Export Excel</button>
                <button onClick={generatePDFInvoice} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"><FileText size={18} /> Generate Invoice PDF</button>
              </div>
            </header>

            <main className="flex-1 flex flex-col p-8 gap-6 overflow-hidden">
              <div className="grid grid-cols-2 gap-6 shrink-0">
                <div className="bg-white p-6 rounded-2xl border shadow-sm border-l-4 border-l-blue-500"><p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Orders in Selected Range</p><h3 className="text-3xl font-black text-gray-800">{totalOrders}</h3></div>
                <div className="bg-white p-6 rounded-2xl border shadow-sm border-l-4 border-l-green-500"><p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Bill Amount</p><h3 className="text-3xl font-black text-green-600">₹{totalSpent}</h3></div>
              </div>

              <div className="bg-white rounded-2xl border shadow-sm flex-1 overflow-y-auto relative">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50/95 backdrop-blur-sm border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-widest sticky top-0 z-10 shadow-sm">
                    <tr><th className="p-4 pl-8">Date & Time</th><th className="p-4">Examiner Name</th><th className="p-4">Voucher Used</th><th className="p-4">Items Consumed</th><th className="p-4 text-right pr-8">Order Total</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-sm">
                    {filteredOrders.length === 0 ? (
                      <tr><td colSpan="5" className="text-center p-8 text-gray-400">No orders found in this date range.</td></tr>
                    ) : (
                      filteredOrders.map((order) => (
                        <tr key={order._id} className="hover:bg-gray-50/50 transition-all">
                          <td className="p-4 pl-8"><p className="font-bold text-gray-800 text-sm">{new Date(order.orderDate || order.createdAt).toLocaleDateString('en-GB')}</p><p className="text-[11px] text-gray-400 font-medium">{new Date(order.orderDate || order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p></td>
                          <td className="p-4 font-bold text-gray-700">{order.facultyId?.fullName || <span className="text-red-400 italic">Deleted User</span>}</td>
                          <td className="p-4"><span className="font-mono font-bold text-blue-600 bg-blue-50/50 px-2 py-1 rounded text-[11px]">{order.facultyId?.voucherCode || "N/A"}</span></td>
                          <td className="p-4 text-xs text-gray-500">{order.items.map(item => `${item.itemName} (x${item.quantity})`).join(', ')}</td>
                          <td className="p-4 pr-8 text-right font-black text-green-600">₹{order.totalAmount}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </main>
          </>
        )}
      </div>

      {/* FACULTY MODAL */}
      {isModalOpen && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-slate-800">Manually Add Examiner</h2><button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button></div>
            <form onSubmit={handleAddSingle} className="space-y-4">
              <input required type="text" placeholder="Full Name" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2 outline-none focus:border-blue-500" />
              <input required type="email" placeholder="Email Address" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2 outline-none focus:border-blue-500" />
              <input required type="text" placeholder="Mobile Number" value={formData.mobile} onChange={(e) => setFormData({...formData, mobile: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2 outline-none focus:border-blue-500" />
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">Year Scope</label>
                <select 
                  required 
                  value={formData.academicYear} 
                  onChange={(e) => setFormData({...formData, academicYear: e.target.value})} 
                  className="w-full p-3 border rounded-lg focus:ring-2 outline-none focus:border-blue-500 text-sm text-gray-700 bg-white"
                >
                  <option value="2025-26">2025-26 (Default)</option>
                  <option value="2nd Yr (Regular)">2nd Yr (Regular)</option>
                  <option value="2nd Yr (Backlog)">2nd Yr (Backlog)</option>
                  <option value="3rd Yr (Regular)">3rd Yr (Regular)</option>
                  <option value="3rd Yr (Backlog)">3rd Yr (Backlog)</option>
                  <option value="4th Yr (Regular)">4th Yr (Regular)</option>
                </select>
              </div>
              <div className="flex gap-4">
                <div className="flex-1"><label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">Valid From</label><input required type="date" value={formData.validFrom} onChange={(e) => setFormData({...formData, validFrom: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2 outline-none focus:border-blue-500 text-sm text-gray-700" /></div>
                <div className="flex-1"><label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">Valid Till</label><input required type="date" value={formData.validTill} onChange={(e) => setFormData({...formData, validTill: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2 outline-none focus:border-blue-500 text-sm text-gray-700" /></div>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white font-bold p-3 rounded-lg mt-4 hover:bg-blue-700 transition-all">Generate Voucher</button>
            </form>
          </div>
        </div>
      )}

      {/* GUEST MODAL */}
      {isGuestModalOpen && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800">Issue Guest Pass</h2>
                <button onClick={() => setIsGuestModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <form onSubmit={handleAddGuest} className="space-y-4">
              <input required type="text" placeholder="Guest Name (e.g., Flying Squad Member)" value={guestFormData.guestName} onChange={(e) => setGuestFormData({...guestFormData, guestName: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2 outline-none focus:border-purple-500" />
              <input required type="text" placeholder="Host Faculty Voucher Code (PICT-XX-...)" value={guestFormData.facultyVoucher} onChange={(e) => setGuestFormData({...guestFormData, facultyVoucher: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2 outline-none focus:border-purple-500" />
              <div className="flex gap-4">
                <div className="flex-1"><label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">Valid From</label><input required type="date" value={guestFormData.validFrom} onChange={(e) => setGuestFormData({...guestFormData, validFrom: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2 outline-none focus:border-purple-500 text-sm text-gray-700" /></div>
                <div className="flex-1"><label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">Valid Till</label><input required type="date" value={guestFormData.validTill} onChange={(e) => setGuestFormData({...guestFormData, validTill: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2 outline-none focus:border-purple-500 text-sm text-gray-700" /></div>
              </div>
              <button type="submit" className="w-full bg-purple-600 text-white font-bold p-3 rounded-lg mt-4 hover:bg-purple-700 transition-all shadow-lg shadow-purple-200">Issue Guest Code</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoordinatorDashboard;