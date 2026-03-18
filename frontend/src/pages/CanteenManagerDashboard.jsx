import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { Download, Printer, Plus, Edit, Trash2, LogOut, Utensils, CheckCircle2, XCircle, Power, PowerOff } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper function to get strict LOCAL time
const getLocalYYYYMMDD = (dateObj = new Date()) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const CanteenManagerDashboard = () => {
  const navigate = useNavigate();
  
  // 🚀 UPGRADE: Remember the active tab using sessionStorage!
  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('managerTab') || 'orders'); 
  const [orders, setOrders] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  
  const [filterDept, setFilterDept] = useState('All Departments');
  
  const todayStr = getLocalYYYYMMDD();
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [menuForm, setMenuForm] = useState({ itemName: '', category: 'Snacks', price: '' });

  useEffect(() => {
    fetchOrders();
    fetchDepartments();
    fetchMenuItems();
  }, []);

  // Save tab state on change
  useEffect(() => {
      sessionStorage.setItem('managerTab', activeTab);
  }, [activeTab]);

  const fetchOrders = async () => {
      try { 
          const res = await API.get('/orders/all'); 
          if (Array.isArray(res.data)) setOrders(res.data);
      } catch (err) { console.error("Error fetching orders:", err); }
  };

  const fetchDepartments = async () => {
      try { 
          const res = await API.get('/departments/all'); 
          if (Array.isArray(res.data)) setDepartments(res.data);
      } catch (err) { console.error("Error fetching depts"); }
  };

  const fetchMenuItems = async () => {
      try { 
          const res = await API.get('/menu/all'); 
          if (Array.isArray(res.data)) setMenuItems(res.data);
      } catch (err) { console.error("Error fetching menu"); }
  };

  const filteredOrders = orders.filter(order => {
      if (order.createdAt || order.orderDate) {
          const rawDate = new Date(order.createdAt || order.orderDate);
          const localOrderDate = getLocalYYYYMMDD(rawDate);
          
          if (startDate && localOrderDate < startDate) return false;
          if (endDate && localOrderDate > endDate) return false;
      }

      if (filterDept !== 'All Departments') {
          const deptName = order.departmentId?.name || "Unknown";
          if (deptName !== filterDept) return false;
      }
      return true;
  });

  const handleMenuSubmit = async (e) => {
      e.preventDefault();
      try {
          if (editingItemId) {
              await API.put(`/menu/update/${editingItemId}`, menuForm);
          } else {
              await API.post('/menu/add', menuForm);
          }
          setIsMenuModalOpen(false);
          setMenuForm({ itemName: '', category: 'Snacks', price: '' });
          setEditingItemId(null);
          fetchMenuItems();
      } catch (err) { alert(`Failed to save: ${err.response?.data?.error || err.message}`); }
  };

  const editMenuItem = (item) => {
      setEditingItemId(item._id);
      setMenuForm({ itemName: item.itemName, category: item.category, price: item.price });
      setIsMenuModalOpen(true);
  };

  const deleteMenuItem = async (id) => {
      if(window.confirm("Are you sure you want to permanently delete this item?")) {
          try { await API.delete(`/menu/delete/${id}`); fetchMenuItems(); } 
          catch (err) { alert("Failed to delete item."); }
      }
  };

  // 🚀 UPGRADE: Quick toggle for "Out of Stock"
  const toggleAvailability = async (item) => {
      try {
          await API.put(`/menu/update/${item._id}`, { ...item, isAvailable: !item.isAvailable });
          fetchMenuItems();
      } catch (err) {
          console.error("Failed to update availability");
      }
  };

  const downloadReport = () => {
      const doc = new jsPDF();
      const img = new Image();
      img.src = '/image1.jpeg'; 
      
      img.onload = () => {
        doc.setGState(new doc.GState({ opacity: 0.15 }));
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
        
        const deptCodeName = filterDept !== 'All Departments' ? filterDept.substring(0, 4).toUpperCase() : 'ALL';
        const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const refNo = `Ref No: PICT/CNTN/${dateStr}/${deptCodeName}-01`;
        const dateRangeText = `Date: ${startDate ? new Date(startDate).toLocaleDateString('en-GB') : 'All'} to ${endDate ? new Date(endDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')}`;
        
        doc.text(refNo, 14, 50);
        doc.text(dateRangeText, 140, 50);
        doc.setFont("helvetica", "bold");
        // 🚀 BONUS FIX: Stop it from saying "ALL DEPARTMENTS DEPARTMENT"
        const deptTitle = filterDept === 'All Departments' 
            ? "ALL DEPARTMENTS" 
            : `${filterDept.toUpperCase()} DEPARTMENT`;
        doc.text(`Department: ${deptTitle}`, 14, 58);

        const facultyOrders = filteredOrders.filter(o => !o.voucherCode?.startsWith('G-'));
        const guestOrders = filteredOrders.filter(o => o.voucherCode?.startsWith('G-'));

        const facultyTotals = {};
        facultyOrders.forEach(order => {
            const rawDate = new Date(order.createdAt || order.orderDate).toLocaleDateString('en-GB');
            const baseName = order.facultyId?.fullName || 'Unknown Faculty';
            const groupingKey = `${baseName}_${rawDate}`; 
            if (!facultyTotals[groupingKey]) facultyTotals[groupingKey] = { displayName: baseName, date: rawDate, items: [], total: 0 };
            facultyTotals[groupingKey].total += order.totalAmount;
            facultyTotals[groupingKey].items.push(order.items.map(i => `${i.itemName}(x${i.quantity})`).join(', '));
        });

        const guestTotals = {};
        guestOrders.forEach(order => {
            const rawDate = new Date(order.createdAt || order.orderDate).toLocaleDateString('en-GB');
            const actualGuestName = order.guestName || 'Guest';
            const baseName = `${actualGuestName} \n(Host: ${order.facultyId?.fullName || 'Unknown'})`;
            const groupingKey = `${baseName}_${rawDate}`;
            if (!guestTotals[groupingKey]) guestTotals[groupingKey] = { displayName: baseName, date: rawDate, items: [], total: 0 };
            guestTotals[groupingKey].total += order.totalAmount;
            guestTotals[groupingKey].items.push(order.items.map(i => `${i.itemName}(x${i.quantity})`).join(', '));
        });

        let currentY = 70;
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("SECTION A: FACULTY CONSUMPTION", 14, currentY);
        
        const facultyTableData = Object.values(facultyTotals).map((data, index) => [ index + 1, data.date, data.displayName, data.items.join(' | '), `Rs. ${data.total}` ]);
        const facultySum = Object.values(facultyTotals).reduce((sum, val) => sum + val.total, 0);

        autoTable(doc, {
          startY: currentY + 3,
          head: [['Sr', 'Date', 'Faculty Name', 'Items Consumed', 'Total (Rs)']],
          body: facultyTableData.length ? facultyTableData : [['-', '-', 'No Faculty Orders', '-', '-']],
          theme: 'grid',
          headStyles: { fillColor: [50, 50, 50] },
          bodyStyles: { fillColor: false }, 
          alternateRowStyles: { fillColor: false },
          styles: { fontSize: 8, cellPadding: 3 }, 
          columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 1: { cellWidth: 20 }, 4: { halign: 'right', cellWidth: 25 } }
        });

        currentY = doc.lastAutoTable.finalY;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(`Sub-Total (Faculty): Rs. ${facultySum}/-`, 140, currentY + 8);

        currentY += 18;
        doc.text("SECTION B: GUEST/EXTERNAL CONSUMPTION", 14, currentY);
        
        const guestTableData = Object.values(guestTotals).map((data, index) => [ index + 1, data.date, data.displayName, data.items.join(' | '), `Rs. ${data.total}` ]);
        const guestSum = Object.values(guestTotals).reduce((sum, val) => sum + val.total, 0);

        autoTable(doc, {
          startY: currentY + 3,
          head: [['Sr', 'Date', 'Guest Details', 'Items Consumed', 'Total (Rs)']],
          body: guestTableData.length ? guestTableData : [['-', '-', 'No Guest Orders', '-', '-']],
          theme: 'grid',
          headStyles: { fillColor: [50, 50, 50] },
          bodyStyles: { fillColor: false },
          alternateRowStyles: { fillColor: false },
          styles: { fontSize: 8, cellPadding: 3 },
          columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 1: { cellWidth: 20 }, 4: { halign: 'right', cellWidth: 25 } }
        });

        currentY = doc.lastAutoTable.finalY;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(`Sub-Total (Guest): Rs. ${guestSum}/-`, 140, currentY + 8);

        const grandTotal = facultySum + guestSum;
        doc.rect(130, currentY + 15, 66, 10);
        doc.setFontSize(12);
        doc.text(`GRAND TOTAL`, 135, currentY + 22);
        doc.text(`Rs. ${grandTotal}`, 175, currentY + 22);

        const pageHeight = doc.internal.pageSize.getHeight();
        let signatureY = currentY + 50; 
        if (signatureY + 30 > pageHeight - 20) {
            doc.addPage();
            signatureY = 40; 
        }

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.line(20, signatureY, 60, signatureY);
        doc.text("MESS MANAGER", 25, signatureY + 6);
        doc.line(85, signatureY, 135, signatureY);
        doc.text("PRACTICAL COORDINATOR", 87, signatureY + 6);
        doc.line(160, signatureY, 200, signatureY);
        doc.text("HEAD OF DEPARTMENT", 162, signatureY + 6);
        doc.line(45, signatureY + 25, 85, signatureY + 25);
        doc.text("CEO", 60, signatureY + 31);
        doc.line(135, signatureY + 25, 175, signatureY + 25);
        doc.text("PRINCIPAL", 148, signatureY + 31);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.text("SYSTEM GENERATED REPORT | PICT CANTEEN & MESS SECTION", 65, pageHeight - 5);

        doc.save(`Canteen_Report_${filterDept.replace(/\s+/g, '_')}_${startDate}.pdf`);
      };
      img.onerror = () => { alert("Failed to load watermark image."); };
  };

  const printReceipt = (order) => {
      const doc = new jsPDF({ format: [80, 150] }); 
      doc.setFontSize(12);
      doc.text("PICT CANTEEN", 25, 10);
      doc.setFontSize(8);
      doc.text("--------------------------------", 10, 15);
      doc.text(`Date: ${new Date(order.createdAt || order.orderDate || Date.now()).toLocaleString()}`, 10, 20);
      doc.text(`Billed To: ${order.facultyId?.fullName || 'Walk-in'}`, 10, 25);
      doc.text(`Dept: ${order.departmentId?.name || 'N/A'}`, 10, 30); 
      doc.text("--------------------------------", 10, 35);
      
      let y = 40;
      if(order.items) {
          order.items.forEach(item => {
              doc.text(`${item.itemName} x${item.quantity}`, 10, y);
              doc.text(`Rs.${item.price}`, 60, y);
              y += 5;
          });
      }
      
      doc.text("--------------------------------", 10, y);
      doc.setFontSize(10);
      doc.text(`TOTAL: Rs. ${order.totalAmount || 0}`, 10, y + 6);
      doc.save(`Receipt_${order._id.substring(0,6)}.pdf`);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fc] font-sans text-slate-800">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm flex justify-between items-center px-6 py-4">
          <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-2.5 rounded-xl shadow-inner border border-blue-500"><Utensils size={22} /></div>
              <div>
                <h1 className="text-xl font-black text-slate-800 tracking-tight leading-tight">Canteen Manager</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kitchen Operations Dashboard</p>
              </div>
          </div>
          <button onClick={() => { sessionStorage.clear(); navigate('/'); }} className="flex items-center gap-2 text-slate-400 hover:text-red-600 font-bold transition-colors bg-slate-50 hover:bg-red-50 px-4 py-2 rounded-lg border border-slate-200 hover:border-red-200">
              <LogOut size={16} /> Logout
          </button>
      </header>

      <div className="max-w-7xl mx-auto p-4 md:p-8">
          
          {/* TABS */}
          <div className="flex gap-2 border-b border-slate-200 mb-6 bg-white p-1.5 rounded-xl shadow-sm border inline-flex">
              <button onClick={() => setActiveTab('orders')} className={`px-6 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'orders' ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>Live Orders</button>
              <button onClick={() => setActiveTab('menu')} className={`px-6 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'menu' ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>Menu Management</button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 min-h-[600px]">
              
              {/* ================= TAB 1: ORDERS ================= */}
              {activeTab === 'orders' && (
                  <div className="animate-in fade-in duration-300">
                      <div className="flex flex-wrap items-end gap-5 mb-8 bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-inner">
                          <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Department</label>
                              <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="w-56 p-3 border-2 border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 bg-white shadow-sm transition-all">
                                  <option value="All Departments">All Departments</option>
                                  {departments.map(d => <option key={d._id} value={d.name}>{d.name}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">From Date</label>
                              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-44 p-3 border-2 border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 text-slate-700 bg-white shadow-sm transition-all" />
                          </div>
                          <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">To Date</label>
                              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-44 p-3 border-2 border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 text-slate-700 bg-white shadow-sm transition-all" />
                          </div>
                          <button onClick={downloadReport} className="ml-auto bg-slate-800 hover:bg-black text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-slate-200 transition-all active:scale-95">
                              <Download size={18} /> Download Official PDF
                          </button>
                      </div>

                      <div className="flex items-center justify-between mb-4 px-2">
                          <h2 className="text-xl font-black text-slate-800 tracking-tight">Orders in Range</h2>
                          <span className="bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1 rounded-lg text-sm font-black shadow-inner">{filteredOrders.length}</span>
                      </div>

                      <div className="overflow-x-auto border-2 border-slate-100 rounded-2xl shadow-sm">
                          <table className="w-full text-left border-collapse">
                              <thead className="bg-slate-50 border-b-2 border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                  <tr>
                                      <th className="py-5 px-6">Billed To</th>
                                      <th className="py-5 px-6">Department</th>
                                      <th className="py-5 px-6">Date</th>
                                      <th className="py-5 px-6">Items Ordered</th>
                                      <th className="py-5 px-6">Amount</th>
                                      <th className="py-5 px-6 text-right">Actions</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y-2 divide-slate-50 text-sm">
                                  {filteredOrders.length === 0 ? (
                                      <tr><td colSpan="6" className="text-center py-16 text-slate-400 font-bold bg-white">No orders found. Try clearing the dates!</td></tr>
                                  ) : (
                                      filteredOrders.map(order => {
                                          const orderDateDisplay = order.createdAt || order.orderDate ? new Date(order.createdAt || order.orderDate).toLocaleString('en-GB', {day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit'}) : 'No Date';
                                          const isGuest = order.voucherCode?.startsWith('G-');
                                          
                                          return (
                                              <tr key={order._id} className="hover:bg-blue-50/50 transition-colors bg-white group">
                                                  <td className="py-4 px-6">
                                                      <p className="font-bold text-slate-800">
                                                          {isGuest ? `${order.guestName || 'Guest'} ` : (order.facultyId?.fullName || 'Walk-In')}
                                                      </p>
                                                      {isGuest && <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">Host: {order.facultyId?.fullName}</p>}
                                                  </td>
                                                  <td className="py-4 px-6">
                                                      <span className="bg-slate-100 text-slate-600 font-bold px-3 py-1.5 rounded-md text-[10px] uppercase tracking-widest border border-slate-200 block w-max">
                                                          {order.departmentId?.name || 'Unknown'}
                                                      </span>
                                                  </td>
                                                  <td className="py-4 px-6 text-slate-500 text-xs font-bold">{orderDateDisplay}</td>
                                                  <td className="py-4 px-6 text-slate-600 text-xs font-semibold leading-relaxed max-w-xs">
                                                      {order.items?.map(i => `${i.itemName} (x${i.quantity})`).join(', ') || 'No Items'}
                                                  </td>
                                                  <td className="py-4 px-6 font-black text-emerald-600 text-base">₹{order.totalAmount || 0}</td>
                                                  <td className="py-4 px-6 text-right">
                                                      <button onClick={() => printReceipt(order)} className="bg-white border-2 border-slate-200 hover:border-blue-500 hover:text-blue-600 text-slate-500 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2 ml-auto">
                                                          <Printer size={16} /> Print KOT
                                                      </button>
                                                  </td>
                                              </tr>
                                          )
                                      })
                                  )}
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}

              {/* ================= TAB 2: MENU MANAGEMENT ================= */}
              {activeTab === 'menu' && (
                  <div className="animate-in fade-in duration-300">
                      <div className="flex justify-between items-center mb-8 px-2">
                          <div>
                              <h2 className="text-xl font-black text-slate-800 tracking-tight">Menu Configuration</h2>
                              <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Toggle items off if ingredients run out</p>
                          </div>
                          <button onClick={() => { setMenuForm({itemName:'', category:'Snacks', price:''}); setEditingItemId(null); setIsMenuModalOpen(true); }} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-95 transition-all">
                              <Plus size={18} /> Add New Item
                          </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                          {menuItems.map(item => {
                              // Fallback if the database doesn't have isAvailable yet (defaults to true)
                              const isAvailable = item.isAvailable !== false; 
                              
                              return (
                              <div key={item._id} className={`border-2 p-5 rounded-2xl flex justify-between items-center transition-all bg-white relative overflow-hidden group ${isAvailable ? 'border-slate-100 hover:border-blue-300 hover:shadow-md' : 'border-red-100 bg-red-50/30 opacity-75'}`}>
                                  <div className="relative z-10">
                                      <div className="flex items-center gap-2 mb-2">
                                          <span className="text-[9px] font-black text-blue-600 bg-blue-100 px-2 py-1 rounded uppercase tracking-widest">{item.category}</span>
                                          {isAvailable ? 
                                              <span className="flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded uppercase tracking-widest border border-emerald-100"><CheckCircle2 size={10}/> In Stock</span> : 
                                              <span className="flex items-center gap-1 text-[9px] font-black text-red-600 bg-red-50 px-2 py-1 rounded uppercase tracking-widest border border-red-100"><XCircle size={10}/> Out of Stock</span>
                                          }
                                      </div>
                                      <h3 className={`font-black text-lg tracking-tight ${isAvailable ? 'text-slate-800' : 'text-slate-500 line-through'}`}>{item.itemName}</h3>
                                      <p className="font-black text-slate-500 mt-1">₹{item.price}</p>
                                  </div>
                                  
                                  <div className="flex flex-col gap-2 relative z-10">
                                      {/* THE STOCK TOGGLE BUTTON */}
                                      <button onClick={() => toggleAvailability(item)} className={`p-2.5 rounded-xl transition-all shadow-sm ${isAvailable ? 'bg-white border border-slate-200 text-red-500 hover:bg-red-50 hover:border-red-200' : 'bg-emerald-500 text-white shadow-emerald-200 hover:bg-emerald-600'}`} title={isAvailable ? "Mark Out of Stock" : "Mark In Stock"}>
                                          {isAvailable ? <PowerOff size={18}/> : <Power size={18}/>}
                                      </button>
                                      
                                      <div className="flex gap-2">
                                          <button onClick={() => editMenuItem(item)} className="p-2.5 bg-slate-50 border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 rounded-xl transition-colors"><Edit size={16}/></button>
                                          <button onClick={() => deleteMenuItem(item._id)} className="p-2.5 bg-slate-50 border border-slate-200 text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 rounded-xl transition-colors"><Trash2 size={16}/></button>
                                      </div>
                                  </div>
                              </div>
                          )})}
                      </div>
                  </div>
              )}
          </div>
      </div>

       {/* MENU MODAL */}
       {isMenuModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
              <div className="bg-white p-8 rounded-3xl w-full max-w-sm shadow-2xl animate-in zoom-in duration-200 border border-slate-100">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-black text-slate-800 tracking-tight">{editingItemId ? 'Edit Item' : 'New Menu Item'}</h2>
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Utensils size={20}/></div>
                  </div>
                  <form onSubmit={handleMenuSubmit} className="space-y-5">
                      <div>
                          <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Item Name</label>
                          <input required type="text" placeholder="e.g. Masala Dosa" value={menuForm.itemName} onChange={(e) => setMenuForm({...menuForm, itemName: e.target.value})} className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all" />
                      </div>
                      <div>
                          <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Category</label>
                          <select value={menuForm.category} onChange={(e) => setMenuForm({...menuForm, category: e.target.value})} className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all">
                              <option value="Beverages">Beverages</option>
                              <option value="Snacks">Snacks</option>
                              <option value="Lunch">Lunch</option>
                              <option value="Dessert">Dessert</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Price (₹)</label>
                          <input required type="number" placeholder="0" value={menuForm.price} onChange={(e) => setMenuForm({...menuForm, price: e.target.value})} className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all" />
                      </div>
                      <div className="flex gap-3 mt-8 pt-4 border-t border-slate-100">
                          <button type="button" onClick={() => setIsMenuModalOpen(false)} className="flex-1 py-3.5 border-2 border-slate-200 font-bold text-slate-500 rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-all">Cancel</button>
                          <button type="submit" className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95">Save Menu Item</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default CanteenManagerDashboard;