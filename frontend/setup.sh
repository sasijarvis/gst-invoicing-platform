#!/bin/bash
# 🚀 GST Invoice Platform Frontend Structure Setup

echo "📁 Creating project structure..."

# Base folders
mkdir -p gst-invoice-platform/frontend/{public/{images,logos},src}
cd gst-invoice-platform/frontend || exit

# Public assets
touch public/favicon.ico

# === APP ROUTER ===
# Auth group
mkdir -p src/app/'(auth)'/{login,register,verify-email,forgot-password,reset-password}
touch src/app/'(auth)'/{layout.jsx,login/page.jsx,register/page.jsx,verify-email/page.jsx,forgot-password/page.jsx,reset-password/page.jsx}

# Dashboard group
mkdir -p src/app/'(dashboard)'/{dashboard,invoices/{new,recurring,templates,'[id]'/{preview,history}},clients/{new,'[id]'/invoices},products/new,expenses/new,payments/outstanding,reports/{gstr1,gstr3b,sales,profit-loss},settings/{business,billing,notifications,integrations}}
touch src/app/'(dashboard)'/{layout.jsx}
touch src/app/'(dashboard)'/dashboard/page.jsx
touch src/app/'(dashboard)'/invoices/{page.jsx,new/page.jsx,recurring/page.jsx,templates/page.jsx,'[id]'/page.jsx,'[id]'/preview/page.jsx,'[id]'/history/page.jsx}
touch src/app/'(dashboard)'/clients/{page.jsx,new/page.jsx,'[id]'/page.jsx,'[id]'/invoices/page.jsx}
touch src/app/'(dashboard)'/products/{page.jsx,new/page.jsx}
touch src/app/'(dashboard)'/expenses/{page.jsx,new/page.jsx}
touch src/app/'(dashboard)'/payments/{page.jsx,outstanding/page.jsx}
touch src/app/'(dashboard)'/reports/{page.jsx,gstr1/page.jsx,gstr3b/page.jsx,sales/page.jsx,profit-loss/page.jsx}
touch src/app/'(dashboard)'/settings/{page.jsx,business/page.jsx,billing/page.jsx,notifications/page.jsx,integrations/page.jsx}

# Public group
mkdir -p src/app/'(public)'/{pricing,features,blog/'[slug]'}
touch src/app/'(public)'/{layout.jsx,page.jsx,pricing/page.jsx,features/page.jsx,blog/page.jsx,blog/'[slug]'/page.jsx}

# API routes
mkdir -p src/app/api/webhooks/razorpay
touch src/app/api/webhooks/razorpay/route.js

# Root layout & global styles
touch src/app/{layout.jsx,globals.css}

# === COMPONENTS ===
mkdir -p src/components/{ui,layout,invoice/templates,client,product,expense,payment,reports,pdf,common,landing}

# UI
touch src/components/ui/{button.jsx,input.jsx,card.jsx,dialog.jsx,dropdown-menu.jsx,table.jsx,toast.jsx,badge.jsx,select.jsx}

# Layout
touch src/components/layout/{Navbar.jsx,Sidebar.jsx,Footer.jsx,DashboardLayout.jsx}

# Invoice
touch src/components/invoice/{InvoiceForm.jsx,InvoicePreview.jsx,InvoiceTable.jsx,InvoiceFilters.jsx,InvoiceStats.jsx,RecurringInvoiceForm.jsx}
touch src/components/invoice/templates/{Template1.jsx,Template2.jsx,Template3.jsx}

# Client
touch src/components/client/{ClientForm.jsx,ClientTable.jsx,ClientCard.jsx,ClientStats.jsx,GSTINValidator.jsx}

# Product
touch src/components/product/{ProductForm.jsx,ProductTable.jsx,HSNCodePicker.jsx}

# Expense
touch src/components/expense/{ExpenseForm.jsx,ExpenseTable.jsx,ExpenseCategories.jsx}

# Payment
touch src/components/payment/{PaymentForm.jsx,PaymentTable.jsx,PaymentLinkButton.jsx}

# Reports
touch src/components/reports/{GSTR1Report.jsx,GSTR3BReport.jsx,SalesSummary.jsx,ProfitLossReport.jsx,ExportButtons.jsx}

# PDF
touch src/components/pdf/{InvoicePDF.jsx,PDFDownloadButton.jsx}

# Common
touch src/components/common/{LoadingSpinner.jsx,ErrorBoundary.jsx,EmptyState.jsx,SearchBar.jsx,Pagination.jsx,ConfirmDialog.jsx}

# Landing
touch src/components/landing/{Hero.jsx,Features.jsx,Pricing.jsx,Testimonials.jsx,CTA.jsx}

# === LIB, HOOKS, CONTEXTS, TYPES ===
mkdir -p src/{lib/queries,hooks,contexts,types}
touch src/lib/{api.js,auth.js,utils.js,constants.js,validators.js,gst-calculator.js,queryClient.js}
touch src/lib/queries/{useInvoices.js,useClients.js,useProducts.js,usePayments.js,useExpenses.js}
touch src/hooks/{useAuth.js,useDebounce.js,useLocalStorage.js,useMediaQuery.js}
touch src/contexts/{AuthContext.jsx,ThemeContext.jsx}
touch src/types/index.ts

# === CONFIG & ENV FILES ===
touch .env.local .env.production next.config.js tailwind.config.js postcss.config.js package.json jsconfig.json

echo "✅ Frontend folder structure created successfully!"
