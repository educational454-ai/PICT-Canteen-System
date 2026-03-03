import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { Download, Printer, Plus, Edit, Trash2, LogOut, Utensils } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Helper function to get strict LOCAL time (Prevents the UTC timezone bug!)
const getLocalYYYYMMDD = (dateObj = new Date()) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const CanteenManagerDashboard = () => {
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('orders'); 
  const [orders, setOrders] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  
  const [filterDept, setFilterDept] = useState('All Departments');
  
  // Use local time for the default date fields
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

  const fetchOrders = async () => {
      try { 
          const res = await API.get('/orders/all'); 
          if (Array.isArray(res.data)) setOrders(res.data);
      } 
      catch (err) { console.error("Error fetching orders:", err); }
  };

  const fetchDepartments = async () => {
      try { 
          const res = await API.get('/departments/all'); 
          if (Array.isArray(res.data)) setDepartments(res.data);
      } 
      catch (err) { console.error("Error fetching depts"); }
  };

  const fetchMenuItems = async () => {
      try { 
          const res = await API.get('/menu/all'); 
          if (Array.isArray(res.data)) setMenuItems(res.data);
      } 
      catch (err) { console.error("Error fetching menu"); }
  };

  // --- STRICT LOCAL TIME FILTER LOGIC ---
  const filteredOrders = orders.filter(order => {
      // 1. Date Check (Using Local Time Fix)
      if (order.createdAt || order.orderDate) {
          const rawDate = new Date(order.createdAt || order.orderDate);
          const localOrderDate = getLocalYYYYMMDD(rawDate);
          
          if (startDate && localOrderDate < startDate) return false;
          if (endDate && localOrderDate > endDate) return false;
      }

      // 2. Department Check
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
              alert("Item updated successfully!");
          } else {
              await API.post('/menu/add', menuForm);
              alert("Item added successfully!");
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
      if(window.confirm("Are you sure you want to delete this item?")) {
          try { await API.delete(`/menu/delete/${id}`); fetchMenuItems(); } 
          catch (err) { alert("Failed to delete item."); }
      }
  };

  const downloadReport = () => {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Canteen Revenue Report", 14, 20);
      doc.setFontSize(10);
      doc.text(`Period: ${startDate} to ${endDate} | Dept: ${filterDept}`, 14, 28);
      
      const tableData = filteredOrders.map(o => [
          o.facultyId?.fullName || 'Unknown Faculty',
          o.departmentId?.name || 'Unknown Dept',
          o.items?.map(i => `${i.itemName}(x${i.quantity})`).join(', ') || 'No Items',
          `Rs.${o.totalAmount || 0}`
      ]);

      doc.autoTable({ startY: 35, head: [['Billed To', 'Department', 'Items', 'Amount']], body: tableData });
      const totalSpent = filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      doc.text(`Total Revenue: Rs. ${totalSpent}`, 14, doc.lastAutoTable.finalY + 10);
      doc.save(`Canteen_Report_${startDate}_to_${endDate}.pdf`);
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
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm flex justify-between items-center px-6 py-3">
          <div className="flex items-center gap-3">
              <div className="bg-blue-600 text-white p-2 rounded-lg"><Utensils size={20} /></div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">Canteen Manager</h1>
          </div>
          <button onClick={() => { sessionStorage.clear(); navigate('/'); }} className="flex items-center gap-2 text-slate-500 hover:text-red-600 font-bold transition-colors">
              <LogOut size={18} /> Logout
          </button>
      </header>

      <div className="max-w-7xl mx-auto p-6">
          <div className="flex gap-6 border-b border-slate-200 mb-6">
              <button onClick={() => setActiveTab('orders')} className={`pb-3 text-sm font-bold transition-all ${activeTab === 'orders' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-500 hover:text-slate-800'}`}>Live Orders</button>
              <button onClick={() => setActiveTab('menu')} className={`pb-3 text-sm font-bold transition-all ${activeTab === 'menu' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-500 hover:text-slate-800'}`}>Menu Management</button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 min-h-[500px]">
              {activeTab === 'orders' && (
                  <>
                      <div className="flex flex-wrap items-end gap-5 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Department</label>
                              <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="w-48 p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 bg-white">
                                  <option value="All Departments">All Departments</option>
                                  {departments.map(d => <option key={d._id} value={d.name}>{d.name}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">From Date</label>
                              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40 p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 text-slate-700 bg-white" />
                          </div>
                          <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">To Date</label>
                              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40 p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 text-slate-700 bg-white" />
                          </div>
                          <button onClick={downloadReport} className="ml-auto bg-[#10b981] hover:bg-[#059669] text-white px-5 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm transition-colors active:scale-95">
                              <Download size={16} /> Download PDF
                          </button>
                      </div>

                      <div className="flex items-center gap-3 mb-4">
                          <h2 className="text-lg font-bold text-slate-800">Orders in Range</h2>
                          <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-md text-xs font-black">{filteredOrders.length}</span>
                      </div>

                      <div className="overflow-x-auto border border-slate-200 rounded-xl">
                          <table className="w-full text-left border-collapse">
                              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                  <tr>
                                      <th className="py-4 px-5">Billed To (Faculty)</th>
                                      <th className="py-4 px-5">Department</th>
                                      <th className="py-4 px-5">Date</th>
                                      <th className="py-4 px-5">Items Ordered</th>
                                      <th className="py-4 px-5">Amount</th>
                                      <th className="py-4 px-5 text-right">Actions</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-sm">
                                  {filteredOrders.length === 0 ? (
                                      <tr><td colSpan="6" className="text-center py-12 text-slate-400 font-medium bg-slate-50/50">No orders found. Try clearing the dates!</td></tr>
                                  ) : (
                                      filteredOrders.map(order => {
                                          const orderDateDisplay = order.createdAt || order.orderDate ? new Date(order.createdAt || order.orderDate).toLocaleDateString('en-GB') : 'No Date';
                                          
                                          return (
                                              <tr key={order._id} className="hover:bg-blue-50/30 transition-colors">
                                                  <td className="py-4 px-5 font-bold text-slate-700">{order.facultyId?.fullName || 'Unknown Faculty'}</td>
                                                  <td className="py-4 px-5">
                                                      <span className="bg-slate-100 text-slate-600 font-bold px-2.5 py-1 rounded text-[10px] uppercase tracking-wider border border-slate-200">
                                                          {order.departmentId?.name || 'Unknown'}
                                                      </span>
                                                  </td>
                                                  <td className="py-4 px-5 text-slate-500 text-xs font-medium">{orderDateDisplay}</td>
                                                  <td className="py-4 px-5 text-slate-600 text-xs font-medium">
                                                      {order.items?.map(i => `${i.itemName} (x${i.quantity})`).join(', ') || 'No Items'}
                                                  </td>
                                                  <td className="py-4 px-5 font-black text-slate-800">₹{order.totalAmount || 0}</td>
                                                  <td className="py-4 px-5 text-right">
                                                      <button onClick={() => printReceipt(order)} className="bg-white border border-slate-200 hover:border-blue-500 hover:text-blue-600 text-slate-500 px-3 py-1.5 rounded-md text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ml-auto">
                                                          <Printer size={14} /> Print
                                                      </button>
                                                  </td>
                                              </tr>
                                          )
                                      })
                                  )}
                              </tbody>
                          </table>
                      </div>
                  </>
              )}

              {/* ================= TAB 2: MENU MANAGEMENT ================= */}
              {activeTab === 'menu' && (
                  <>
                      <div className="flex justify-between items-center mb-6">
                          <h2 className="text-lg font-bold text-slate-800">Canteen Menu Items</h2>
                          <button onClick={() => { setMenuForm({itemName:'', category:'Snacks', price:''}); setEditingItemId(null); setIsMenuModalOpen(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-blue-700 shadow-sm active:scale-95">
                              <Plus size={16} /> Add New Item
                          </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {menuItems.map(item => (
                              <div key={item._id} className="border border-slate-200 p-4 rounded-xl flex justify-between items-center hover:shadow-md hover:border-blue-300 transition-all bg-white group">
                                  <div>
                                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-widest">{item.category}</span>
                                      <h3 className="font-bold text-slate-800 mt-1.5">{item.itemName}</h3>
                                      <p className="font-black text-slate-600 mt-0.5">₹{item.price}</p>
                                  </div>
                                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => editMenuItem(item)} className="p-2 bg-slate-50 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><Edit size={16}/></button>
                                      <button onClick={() => deleteMenuItem(item._id)} className="p-2 bg-slate-50 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={16}/></button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </>
              )}
          </div>
      </div>

       {/* MENU MODAL */}
       {isMenuModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
              <div className="bg-white p-6 md:p-8 rounded-2xl w-full max-w-sm shadow-xl animate-in zoom-in duration-200">
                  <h2 className="text-xl font-black text-slate-800 mb-5">{editingItemId ? 'Edit Menu Item' : 'Add Menu Item'}</h2>
                  <form onSubmit={handleMenuSubmit} className="space-y-4">
                      <div><label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Item Name</label><input required type="text" value={menuForm.itemName} onChange={(e) => setMenuForm({...menuForm, itemName: e.target.value})} className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:border-blue-500" /></div>
                      <div><label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Category</label><select value={menuForm.category} onChange={(e) => setMenuForm({...menuForm, category: e.target.value})} className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:border-blue-500"><option value="Beverages">Beverages</option><option value="Snacks">Snacks</option><option value="Lunch">Lunch</option><option value="Dessert">Dessert</option></select></div>
                      <div><label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Price (₹)</label><input required type="number" value={menuForm.price} onChange={(e) => setMenuForm({...menuForm, price: e.target.value})} className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:border-blue-500" /></div>
                      <div className="flex gap-3 mt-8"><button type="button" onClick={() => setIsMenuModalOpen(false)} className="flex-1 py-3 border border-slate-200 font-bold text-slate-600 rounded-lg">Cancel</button><button type="submit" className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md">Save</button></div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default CanteenManagerDashboard;