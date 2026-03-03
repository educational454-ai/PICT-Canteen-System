import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { Utensils, LogOut, Trash2, CheckCircle, Ticket, X, UtensilsCrossed, Plus, Mail, ChevronRight, Check } from 'lucide-react';

const MenuPage = () => {
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('menu'); 
  const [menuItems, setMenuItems] = useState([]); 
  const [myGuests, setMyGuests] = useState([]); 
  
  // NEW: Store selections by category instead of an array
  // Example: { "Beverages": { id: 1, name: "Tea", price: 10 }, "Snacks": {...} }
  const [selections, setSelections] = useState({});
  const [loading, setLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [guestFormData, setGuestFormData] = useState({
      guestName: '', email: '', 
      validFrom: new Date().toISOString().split('T')[0], 
      validTill: new Date().toISOString().split('T')[0]
  });

  const voucher = sessionStorage.getItem('userVoucher') || 'Unknown';
  const userName = sessionStorage.getItem('userName') || 'User';
  const userRole = sessionStorage.getItem('userRole') || 'GUEST'; 

  useEffect(() => {
    if (voucher === 'Unknown') {
        navigate('/');
        return;
    }
    const fetchMenu = async () => {
      try {
        const res = await API.get('/menu/all');
        if (Array.isArray(res.data)) setMenuItems(res.data);
      } catch (err) { console.error("Menu fetch error", err); }
    };

    fetchMenu();
    if (userRole === 'FACULTY') fetchMyGuests();
  }, [voucher, userRole, navigate]);

  const fetchMyGuests = async () => {
      try {
          const res = await API.get(`/guests/faculty/${voucher}`);
          if (Array.isArray(res.data)) setMyGuests(res.data);
      } catch (err) { console.error("Guest fetch error", err); }
  };

  // --- NEW COMBO SELECTION LOGIC ---
  const toggleSelection = (item) => {
    const category = item.category || 'Other';
    setSelections((prev) => {
      const currentSelections = { ...prev };
      
      // If clicking the exact same item, deselect it
      if (currentSelections[category]?._id === item._id) {
        delete currentSelections[category];
      } else {
        // Otherwise, replace whatever was in this category with the new item
        currentSelections[category] = item;
      }
      return currentSelections;
    });
  };

  const removeSelection = (category) => {
    setSelections((prev) => {
      const currentSelections = { ...prev };
      delete currentSelections[category];
      return currentSelections;
    });
  };

  // Convert selections object into an array for the summary and backend
  const selectedItemsList = Object.values(selections);
  const totalAmount = selectedItemsList.reduce((acc, item) => acc + (item.price || 0), 0);

  // Group menu items by category for the UI
  const groupedMenu = menuItems.reduce((acc, item) => {
      const cat = item.category || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
  }, {});

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const orderData = {
        voucherCode: voucher,
        // Backend always gets exactly 1 quantity per selected item
        items: selectedItemsList.map(item => ({ itemName: item.itemName, quantity: 1, price: item.price })),
        totalAmount: totalAmount
      };
      await API.post('/orders/place', orderData);
      setOrderSuccess(true);
      setSelections({}); // Clear selections
      setTimeout(() => setOrderSuccess(false), 3000);
    } catch (err) { alert(err.response?.data?.error || "Order failed. You may have already ordered today."); } 
    finally { setLoading(false); }
  };

  const handleAddGuest = async (e) => {
    e.preventDefault();
    try {
        const res = await API.post('/guests/add', { ...guestFormData, facultyVoucher: voucher });
        alert(`Success! Hand this code to your guest: ${res.data.voucher}`);
        setIsGuestModalOpen(false);
        setGuestFormData({ guestName: '', email: '', validFrom: new Date().toISOString().split('T')[0], validTill: new Date().toISOString().split('T')[0] });
        fetchMyGuests(); 
    } catch (err) { alert(`Failed to add guest: ${err.response?.data?.error || err.message}`); }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-800">
      
      {/* HEADER */}
      <header className="bg-[#0f2040] text-white shadow-md z-30 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/10 rounded border border-white/20 flex items-center justify-center shrink-0">
                    <span className="text-base font-bold text-blue-300 tracking-tighter">P</span>
                </div>
                <div>
                    <h1 className="text-base md:text-lg font-bold tracking-wide text-white uppercase leading-tight">PICT Canteen</h1>
                    <div className="flex items-center gap-2">
                        <p className="text-[11px] md:text-xs text-slate-300">Welcome, <span className="font-semibold text-white">{userName}</span></p>
                        <span className={`text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded border ${userRole === 'FACULTY' ? 'bg-blue-600/30 text-blue-200 border-blue-500/50' : 'bg-purple-600/30 text-purple-200 border-purple-500/50'}`}>
                            {userRole}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex gap-2 w-full sm:w-auto mt-1 sm:mt-0">
                {userRole === 'FACULTY' && (
                    <button onClick={() => setIsGuestModalOpen(true)} className="flex-1 sm:flex-none flex justify-center items-center gap-1.5 bg-purple-600 hover:bg-purple-700 px-3 py-1.5 rounded-lg font-medium text-xs sm:text-sm transition-colors shadow-sm">
                        <Ticket size={14} /> <span className="hidden sm:inline">Issue Guest Pass</span><span className="sm:hidden">Guest Pass</span>
                    </button>
                )}
                <button onClick={() => { sessionStorage.clear(); navigate('/'); }} className="flex-1 sm:flex-none flex justify-center items-center gap-1.5 border border-slate-500 hover:bg-red-600 hover:border-red-600 px-3 py-1.5 rounded-lg font-medium text-xs sm:text-sm transition-colors text-slate-200 hover:text-white">
                    <LogOut size={14} /> Logout
                </button>
            </div>
        </div>
      </header>

      {/* TABS */}
      {userRole === 'FACULTY' && (
        <div className="bg-white border-b border-slate-200 shadow-sm shrink-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-6 overflow-x-auto no-scrollbar">
                <button onClick={() => setActiveTab('menu')} className={`whitespace-nowrap py-3 px-1 font-semibold text-sm border-b-2 flex items-center gap-2 transition-colors ${activeTab === 'menu' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                    <UtensilsCrossed size={16} /> Canteen Menu
                </button>
                <button onClick={() => setActiveTab('guests')} className={`whitespace-nowrap py-3 px-1 font-semibold text-sm border-b-2 flex items-center gap-2 transition-colors ${activeTab === 'guests' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                    <Ticket size={16} /> My Guest Passes
                </button>
            </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:px-6 lg:px-8 py-6 flex flex-col">
          
          {/* TAB 1: CANTEEN MENU */}
          {activeTab === 'menu' && (
            <div className="flex flex-col lg:flex-row gap-6 items-start">
                
                {/* Menu Layout Grouped By Category */}
                <div className="flex-[2] w-full">
                {Object.keys(groupedMenu).length > 0 ? (
                    Object.entries(groupedMenu).map(([category, items]) => (
                        <div key={category} className="mb-8">
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">Select {category}</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {items.map((item) => {
                                    const isSelected = selections[category]?._id === item._id;
                                    return (
                                        <div 
                                            key={item._id} 
                                            onClick={() => toggleSelection(item)}
                                            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex justify-between items-center group ${isSelected ? 'bg-blue-50 border-blue-500 shadow-sm ring-1 ring-blue-500' : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'}`}
                                        >
                                            <div className="pr-3">
                                                <h3 className={`font-semibold text-sm md:text-base leading-tight mt-0.5 ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>{item.itemName}</h3>
                                                <p className={`font-bold text-base md:text-lg mt-0.5 ${isSelected ? 'text-blue-700' : 'text-slate-500'}`}>₹{item.price}</p>
                                            </div>
                                            <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border transition-colors ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-400 group-hover:border-blue-300 group-hover:text-blue-500'}`}>
                                                {isSelected ? <Check size={16} /> : <Plus size={16} />}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="bg-white p-8 rounded-xl border border-dashed border-slate-300 text-center"><p className="text-slate-500 text-sm font-medium">No menu items available.</p></div>
                )}
                </div>

                {/* Combo Summary Sidebar */}
                <div className="w-full lg:w-[380px] bg-white p-5 rounded-xl shadow-sm border border-slate-200 lg:sticky lg:top-24 shrink-0">
                    <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                        <Utensils size={18} className="text-blue-600" />
                        <h2 className="text-lg font-bold text-slate-800">Your Selection</h2>
                    </div>

                    {orderSuccess && <div className="mb-4 p-3 bg-green-50 text-green-700 border border-green-100 rounded-lg flex items-center gap-2 font-medium text-xs"><CheckCircle size={16} /> Order Placed Successfully!</div>}
                    
                    <div className="space-y-2 max-h-[300px] overflow-y-auto mb-5 pr-1 no-scrollbar">
                        {selectedItemsList.length === 0 ? ( <p className="text-slate-400 text-center py-6 font-medium text-xs">Please select one item per category.</p> ) : (
                        selectedItemsList.map((item) => (
                            <div key={item._id} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                <div>
                                    <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest block mb-0.5">{item.category || "Item"}</span>
                                    <p className="font-semibold text-slate-800 text-xs">{item.itemName}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <p className="font-bold text-slate-700 text-sm">₹{item.price}</p>
                                    <button onClick={() => removeSelection(item.category || 'Other')} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                                </div>
                            </div>
                        ))
                        )}
                    </div>

                    {selectedItemsList.length > 0 && (
                        <div className="border-t border-slate-100 pt-4">
                            <div className="flex justify-between items-center text-sm font-bold text-slate-500 mb-4">
                                <span className="uppercase tracking-wider">Total Amount</span>
                                <span className="text-xl text-slate-800 font-black">₹{totalAmount}</span>
                            </div>
                            <button onClick={handleCheckout} disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors active:scale-[0.98] disabled:bg-slate-300 flex justify-center items-center gap-2 text-sm shadow-sm">
                                {loading ? "Processing..." : <>Confirm Order <ChevronRight size={16}/></>}
                            </button>
                        </div>
                    )}
                </div>
            </div>
          )}

          {/* TAB 2: FACULTY GUEST MANAGEMENT (Kept identical to previous) */}
          {activeTab === 'guests' && userRole === 'FACULTY' && (
             <div className="flex flex-col gap-4 w-full">
                {/* ... (Kept the exact same Guest Management UI from previous step to save space) ... */}
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">My Guest Passes</h2>
                        <p className="text-slate-500 text-xs mt-0.5">Manage temporary canteen access for your guests.</p>
                    </div>
                    <button onClick={() => setIsGuestModalOpen(true)} className="w-full sm:w-auto px-4 py-2 bg-purple-600 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-1.5 hover:bg-purple-700 transition-colors shadow-sm">
                        <Plus size={16} /> Create Pass
                    </button>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            <tr>
                                <th className="p-3 pl-5">Guest Details</th>
                                <th className="p-3 text-center">Access Code</th>
                                <th className="p-3 text-center">Validity Period</th>
                                <th className="p-3 text-center pr-5">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {myGuests.length === 0 ? (
                            <tr><td colSpan="4" className="text-center p-8 text-slate-400 font-medium text-xs">You haven't issued any guest passes yet.</td></tr>
                            ) : (
                            myGuests.map((g) => (
                                <tr key={g._id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-3 pl-5">
                                        <p className="font-semibold text-slate-800 text-sm">{g.guestName}</p>
                                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                                            <Mail size={12} /> {g.email || "No email provided"}
                                        </div>
                                    </td>
                                    <td className="p-3 text-center">
                                        <span className="font-mono font-bold text-purple-700 bg-purple-50 border border-purple-100 px-2.5 py-1 rounded-md text-xs tracking-wider">{g.voucherCode}</span>
                                    </td>
                                    <td className="p-3 text-center text-xs text-slate-500 font-medium">
                                        {new Date(g.validFrom).toLocaleDateString('en-GB')} — {new Date(g.validTill).toLocaleDateString('en-GB')}
                                    </td>
                                    <td className="p-3 text-center pr-5">
                                        {new Date() > new Date(g.validTill) || !g.isActive ? (
                                        <span className="text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Expired</span>
                                        ) : (
                                        <span className="text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Active</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                            )}
                        </tbody>
                        </table>
                    </div>
                </div>
             </div>
          )}
      </main>

      {/* GUEST CREATION MODAL */}
      {isGuestModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-5">
                <div>
                    <h2 className="text-lg font-bold text-slate-800">Issue New Pass</h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">Billed to your department account.</p>
                </div>
                <button onClick={() => setIsGuestModalOpen(false)} className="text-slate-400 hover:text-slate-700 bg-slate-100 p-1.5 rounded-md transition-colors"><X size={16}/></button>
            </div>
            
            <form onSubmit={handleAddGuest} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Guest Name <span className="text-red-500">*</span></label>
                <input required type="text" placeholder="e.g. External Examiner" value={guestFormData.guestName} onChange={(e) => setGuestFormData({...guestFormData, guestName: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none font-medium text-sm transition-colors bg-slate-50 focus:bg-white" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Guest Email (Optional)</label>
                <input type="email" placeholder="guest@example.com" value={guestFormData.email} onChange={(e) => setGuestFormData({...guestFormData, email: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none font-medium text-sm transition-colors bg-slate-50 focus:bg-white" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Valid From</label>
                    <input required type="date" value={guestFormData.validFrom} onChange={(e) => setGuestFormData({...guestFormData, validFrom: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none font-medium text-xs transition-colors bg-slate-50 focus:bg-white text-slate-700" />
                </div>
                <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Valid Until</label>
                    <input required type="date" value={guestFormData.validTill} onChange={(e) => setGuestFormData({...guestFormData, validTill: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none font-medium text-xs transition-colors bg-slate-50 focus:bg-white text-slate-700" />
                </div>
              </div>
              <button type="submit" className="w-full bg-purple-600 text-white font-medium py-3 rounded-lg mt-2 hover:bg-purple-700 transition-colors shadow-sm active:scale-[0.98] text-sm">Generate G-Code</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuPage;