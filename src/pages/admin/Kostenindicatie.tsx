import { useState, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { CustomerSearch } from "@/components/admin/travel-guide/CustomerSearch";
import { useProjectsList } from "@/hooks/useProjectsList";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Calculator, FileDown, Loader2, GripVertical, Save, FolderOpen, X, RefreshCw, FileText, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CostEstimatorCard } from "@/components/admin/CostEstimatorCard";
import { CostEstimatorComparison } from "@/components/admin/CostEstimatorComparison";
import { SaveAndAssignCostEstimateDialog } from "@/components/admin/SaveAndAssignCostEstimateDialog";
import { CostEstimatesSheet } from "@/components/admin/CostEstimatesSheet";
import { useCostEstimates, SavedCostEstimate } from "@/hooks/useCostEstimates";
import { useMapboxToken } from "@/hooks/useMapboxToken";
import {
  useCostEstimator,
  ProjectEstimate,
  calculateTotalCosts,
  calculateExtrasCost,
  formatCurrency,
} from "@/hooks/useCostEstimator";

export default function Kostenindicatie() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [scenariosSheetOpen, setScenariosSheetOpen] = useState(false);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedClientName, setSelectedClientName] = useState<string | null>(null);

  const {
    estimates,
    addEstimate,
    updateEstimate,
    removeEstimate,
    addExtra,
    updateExtra,
    removeExtra,
    clearAll,
    reorderEstimates,
    loadSavedEstimates,
    editingScenarioId,
    editingScenarioName,
    cancelEditing,
    clearEditingState,
  } = useCostEstimator();

  const { updateEstimate: updateSavedEstimate, isUpdating } = useCostEstimates();
  const { token: mapboxToken } = useMapboxToken();

  // Handle editing a saved scenario
  const handleEditScenario = (savedEstimates: SavedCostEstimate[]) => {
    loadSavedEstimates(savedEstimates);
    toast.success(`Scenario "${savedEstimates[0]?.name}" geladen voor bewerking`);
  };

  // Handle saving changes to existing scenario
  const handleSaveChanges = async () => {
    if (!editingScenarioName) return;
    
    try {
      // Use Promise.all to ensure all updates complete
      const updatePromises = estimates.map(estimate => 
        updateSavedEstimate({
          id: estimate.id,
          updates: {
            base_price: estimate.basePrice,
            property_type: estimate.propertyType,
            itp_rate: estimate.itpRate,
            extras: estimate.extras,
            costs: estimate.costs,
            notes: estimate.notes,
            delivery_date: estimate.deliveryDate,
          },
        })
      );
      
      await Promise.all(updatePromises);
      toast.success("Wijzigingen opgeslagen");
      clearEditingState();
    } catch (error) {
      console.error("Error updating scenario:", error);
      toast.error("Fout bij opslaan wijzigingen");
    }
  };

  // Drag and drop handlers
  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  }, [draggedIndex]);

  const handleDragEnd = useCallback(() => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      reorderEstimates(draggedIndex, dragOverIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [draggedIndex, dragOverIndex, reorderEstimates]);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const { data: projects = [] } = useProjectsList(false);

  // Allow adding the same project multiple times (e.g. different units)
  const availableProjects = projects;

  const handleAddProject = () => {
    if (!selectedProjectId) return;

    const project = projects.find((p) => p.id === selectedProjectId);
    if (!project) return;

    addEstimate({
      id: project.id,
      name: project.name,
      featured_image: project.featured_image,
      location: project.location || "Spanje",
      city: project.city,
      price_from: project.price_from,
      latitude: project.latitude,
      longitude: project.longitude,
      completion_date: project.completion_date,
    });

    setSelectedProjectId("");
  };

  const generatePdfHtml = (estimate: ProjectEstimate): string => {
    const totalCosts = calculateTotalCosts(estimate.costs);
    const extrasCalc = calculateExtrasCost(estimate.extras);
    const subtotalWithCosts = estimate.basePrice + totalCosts;
    const totalInvestment = subtotalWithCosts + extrasCalc.total;
    const percentageOfPrice = ((totalCosts / estimate.basePrice) * 100).toFixed(1);

    const today = new Date().toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // Split cost rows into two columns
    const costRows = [
      {
        label: estimate.propertyType === "nieuwbouw" ? "BTW (10%)" : `ITP (${estimate.itpRate}%)`,
        amount: estimate.costs.btwOrItp,
      },
      { label: "Zegelbelasting (AJD)", amount: estimate.costs.ajd },
      { label: "Advocaatkosten", amount: estimate.costs.advocaat },
      { label: "Notariskosten", amount: estimate.costs.notaris },
      { label: "Registratiekantoor", amount: estimate.costs.registratie },
      { label: "Volmacht", amount: estimate.costs.volmacht },
      { label: "Nutsaansluitingen", amount: estimate.costs.nutsvoorzieningen },
      { label: "Bankkosten", amount: estimate.costs.bankkosten },
      { label: "Administratie", amount: estimate.costs.administratie },
      { label: "NIE-nummer", amount: estimate.costs.nie },
    ];

    const leftColumn = costRows.slice(0, 5);
    const rightColumn = costRows.slice(5);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Kostenindicatie - ${estimate.projectName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    /* Verberg browser headers/footers bij printen */
    @page { 
      size: A4; 
      margin: 15mm; 
    }
    
    body {
      font-family: 'Inter', sans-serif;
      color: #1a1a1a;
      line-height: 1.3;
      padding: 0;
      margin: 0;
      font-size: 12px;
    }
    
    .header {
      text-align: center;
      margin-bottom: 10px;
    }
    
    .project-image {
      width: 100%;
      max-height: 200px;
      object-fit: cover;
      border-radius: 10px;
      margin-bottom: 10px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .project-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    
    .project-name {
      font-size: 24px;
      font-weight: 700;
      color: #1a365d;
    }
    
    .project-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #64748b;
      font-size: 12px;
    }
    
    .separator { color: #cbd5e1; }
    
    .project-location {
      color: #64748b;
    }
    
    .delivery {
      color: #059669;
      font-weight: 500;
    }
    
    .date {
      color: #94a3b8;
      font-size: 11px;
    }
    
    .section {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 8px 12px;
      margin-bottom: 6px;
    }
    
    .section-title {
      font-size: 11px;
      font-weight: 600;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    
    .base-price-row {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      font-weight: 600;
      padding-bottom: 6px;
      margin-bottom: 6px;
      border-bottom: 1px solid #ddd;
    }
    
    .cost-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0 20px;
    }
    
    .cost-row {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
      font-size: 11px;
    }
    
    .cost-label { color: #666; }
    .cost-amount { font-weight: 500; }
    
    .subtotal {
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px solid #ddd;
      display: flex;
      justify-content: space-between;
      font-size: 12px;
    }
    
    .subtotal-label { font-weight: 600; }
    .subtotal-amount { font-weight: 700; color: #2563eb; }
    .percentage { font-size: 10px; color: #999; margin-left: 5px; }
    
    .extras-combined {
      background: linear-gradient(135deg, #fef7ed 0%, #fef3e2 100%);
      border-radius: 8px;
      padding: 8px 12px;
      margin-bottom: 6px;
      border: 1px solid #fed7aa;
    }
    
    .extras-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 15px;
    }
    
    .extra-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
    }
    
    .extra-included {
      color: #059669;
    }
    
    .extra-included .check { color: #10b981; font-weight: bold; }
    
    .extra-cost {
      color: #92400e;
    }
    
    .extra-price {
      font-weight: 600;
    }
    
    .extra-vat {
      font-size: 9px;
      color: #a16207;
    }
    
    .summary-row {
      display: flex;
      justify-content: space-between;
      background: #f0f9ff;
      border-radius: 6px;
      padding: 7px 12px;
      margin-bottom: 6px;
      font-size: 12px;
    }
    
    .summary-item {
      display: flex;
      gap: 8px;
    }
    
    .summary-label { color: #666; }
    .summary-value { font-weight: 600; color: #1e40af; }
    
    .total-section {
      background: linear-gradient(135deg, #1e3a5f 0%, #0f2942 100%);
      color: white;
      text-align: center;
      padding: 12px;
      border-radius: 10px;
      box-shadow: 0 2px 8px rgba(30, 58, 95, 0.3);
    }
    
    .total-label {
      font-size: 12px;
      opacity: 0.9;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .total-amount {
      font-size: 26px;
      font-weight: 700;
      margin-top: 2px;
    }
    
    .footer {
      text-align: center;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
    }
    
    .footer-brand {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 15px;
      margin-bottom: 6px;
    }
    
    .footer-logo {
      font-weight: 700;
      font-size: 14px;
      color: #1e3a5f;
    }
    
    .footer-contact {
      font-size: 11px;
      color: #64748b;
    }
    
    .footer-divider {
      color: #cbd5e1;
    }
    
    .disclaimer {
      color: #94a3b8;
      font-style: italic;
      font-size: 9px;
    }
    
    @media print {
      html, body { 
        margin: 0 !important; 
        padding: 0 !important; 
        -webkit-print-color-adjust: exact; 
        print-color-adjust: exact; 
      }
    }
    
    .page {
      padding: 20px 25px;
      width: 210mm;
      height: 297mm;
      max-width: 210mm;
      margin: 0 auto;
      position: relative;
    }
  </style>
</head>
<body>
  <div class="page">
  <div class="header">
    ${estimate.projectImage ? `<img src="${estimate.projectImage}" alt="${estimate.projectName}" class="project-image" />` : ""}
    <div class="project-info">
      <span class="project-name">${estimate.projectName.toUpperCase()}</span>
      <div class="project-meta">
        <span class="project-location">${estimate.city || estimate.location}</span>
        ${estimate.deliveryDate ? `
          <span class="separator">•</span>
          <span class="delivery">Oplevering: ${estimate.deliveryDate}</span>
        ` : ""}
        <span class="separator">•</span>
        <span class="date">${today}</span>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Aankoopkosten</div>
    <div class="base-price-row">
      <span>Aankoopprijs</span>
      <span>${formatCurrency(estimate.basePrice)}</span>
    </div>
    <div class="cost-grid">
      <div>
        ${leftColumn.map((row) => `
          <div class="cost-row">
            <span class="cost-label">${row.label}</span>
            <span class="cost-amount">${formatCurrency(row.amount)}</span>
          </div>
        `).join("")}
      </div>
      <div>
        ${rightColumn.map((row) => `
          <div class="cost-row">
            <span class="cost-label">${row.label}</span>
            <span class="cost-amount">${formatCurrency(row.amount)}</span>
          </div>
        `).join("")}
      </div>
    </div>
    <div class="subtotal">
      <span>
        <span class="subtotal-label">Bijkomende kosten</span>
        <span class="percentage">(${percentageOfPrice}%)</span>
      </span>
      <span class="subtotal-amount">${formatCurrency(totalCosts)}</span>
    </div>
  </div>

  ${(extrasCalc.includedItems.length > 0 || extrasCalc.extraItems.length > 0) ? `
    <div class="extras-combined">
      <div class="section-title">Extra's & Meerwerk</div>
      <div class="extras-grid">
        ${extrasCalc.includedItems.slice(0, 6).map((item) => `
          <div class="extra-item extra-included">
            <span class="check">✓</span>
            <span>${item.name}</span>
            <span style="color: #059669; font-size: 9px;">(incl.)</span>
          </div>
        `).join("")}
        ${extrasCalc.extraItems.slice(0, Math.max(0, 6 - extrasCalc.includedItems.length)).map((item) => {
          const vatRate = item.viaDeveloper ? 0.10 : 0.21;
          const vat = item.price * vatRate;
          const total = item.price + vat;
          return `
            <div class="extra-item extra-cost">
              <span>${item.name}</span>
              <span class="extra-price">${formatCurrency(total)}</span>
              <span class="extra-vat">(${item.viaDeveloper ? "10%" : "21%"} BTW)</span>
            </div>
          `;
        }).join("")}
        ${(extrasCalc.includedItems.length + extrasCalc.extraItems.length) > 6 ? `
          <div class="extra-item" style="color: #666; font-style: italic;">+ ${(extrasCalc.includedItems.length + extrasCalc.extraItems.length) - 6} meer...</div>
        ` : ""}
      </div>
    </div>
  ` : ""}

  ${estimate.notes ? `
    <div class="section" style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 1px solid #bbf7d0;">
      <div class="section-title" style="color: #166534;">Opmerkingen</div>
      <p style="font-size: 10px; color: #15803d; line-height: 1.4;">${estimate.notes.length > 120 ? estimate.notes.substring(0, 120) + '...' : estimate.notes}</p>
    </div>
  ` : ""}

  <div class="summary-row">
    <div class="summary-item">
      <span class="summary-label">Bijkomende kosten:</span>
      <span class="summary-value">${formatCurrency(totalCosts)}</span>
    </div>
    ${extrasCalc.total > 0 ? `
      <div class="summary-item">
        <span class="summary-label">Extra's totaal:</span>
        <span class="summary-value">${formatCurrency(extrasCalc.total)}</span>
      </div>
    ` : ""}
  </div>

  <div class="total-section">
    <div class="total-label">Totale Investering</div>
    <div class="total-amount">${formatCurrency(totalInvestment)}</div>
  </div>

  <div class="footer">
    <div class="footer-brand">
      <span class="footer-logo">Top Immo Spain</span>
      <span class="footer-divider">|</span>
      <span class="footer-contact">info@topimmospain.com</span>
      <span class="footer-divider">|</span>
      <span class="footer-contact">+32 468 13 29 03</span>
    </div>
    <div class="disclaimer">* Deze indicatie is vrijblijvend en onder voorbehoud. Werkelijke kosten kunnen variëren.</div>
  </div>
  </div>

</body>
</html>
    `;
  };

  const handleDownloadPdf = async (estimate: ProjectEstimate) => {
    setIsGeneratingPdf(estimate.id);

    try {
      const html = generatePdfHtml(estimate);

      // Open in new window for printing
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();

        // Wait for images to load
        setTimeout(() => {
          printWindow.print();
        }, 800);
      }

      toast.success("PDF wordt gegenereerd");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Fout bij genereren PDF");
    } finally {
      setIsGeneratingPdf(null);
    }
  };

  const generateComparisonPdfHtml = (): string => {
    const today = new Date().toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const calculations = estimates.map((est) => {
      const totalCosts = calculateTotalCosts(est.costs);
      const extrasCalc = calculateExtrasCost(est.extras);
      const subtotalWithCosts = est.basePrice + totalCosts;
      const totalInvestment = subtotalWithCosts + extrasCalc.total;
      return { estimate: est, totalCosts, extrasCalc, subtotalWithCosts, totalInvestment };
    });

    const minTotal = Math.min(...calculations.map((c) => c.totalInvestment));

    // Get all unique extras
    const allExtras = new Set<string>();
    estimates.forEach((est) => est.extras.forEach((e) => allExtras.add(e.name)));
    const extraNames = Array.from(allExtras);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Projectvergelijking - Kostenindicatie</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    @page { size: landscape; margin: 20mm; }
    
    body {
      font-family: 'Inter', sans-serif;
      color: #1a1a1a;
      line-height: 1.4;
      padding: 30px;
    }
    
    .header {
      text-align: center;
      margin-bottom: 25px;
    }
    
    .title {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 5px;
    }
    
    .date {
      color: #666;
      font-size: 14px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    
    th, td {
      padding: 10px 8px;
      border-bottom: 1px solid #e5e5e5;
    }
    
    th {
      background: #f8f9fa;
      font-weight: 600;
      text-align: center;
    }
    
    th:first-child, td:first-child {
      text-align: left;
    }
    
    td {
      text-align: center;
    }
    
    .project-header {
      padding: 15px 8px;
    }
    
    .project-image {
      width: 80px;
      height: 55px;
      object-fit: cover;
      border-radius: 6px;
      margin-bottom: 8px;
    }
    
    .project-name {
      font-weight: 600;
      font-size: 13px;
    }
    
    .project-location {
      color: #666;
      font-size: 11px;
    }
    
    .section-header {
      background: #f1f5f9;
      font-weight: 600;
      color: #475569;
    }
    
    .label-cell {
      color: #666;
    }
    
    .included {
      color: #10b981;
      font-weight: 500;
    }
    
    .total-row {
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
    }
    
    .total-row td {
      font-weight: 700;
      font-size: 14px;
      color: #1d4ed8;
    }
    
    .cheapest {
      background: #dcfce7;
      color: #15803d;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-block;
      margin-top: 4px;
    }
    
    .footer {
      text-align: center;
      margin-top: 25px;
      padding-top: 15px;
      border-top: 1px solid #e5e5e5;
    }
    
    .footer-logo {
      font-weight: 700;
      font-size: 16px;
      color: #2563eb;
    }
    
    .disclaimer {
      font-size: 10px;
      color: #999;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">Projectvergelijking</div>
    <div class="date">${today}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Project</th>
                ${calculations.map((c) => `
          <th class="project-header">
            ${c.estimate.projectImage ? `<img src="${c.estimate.projectImage}" class="project-image" />` : ""}
            <div class="project-name">${c.estimate.projectName.toUpperCase()}</div>
            <div class="project-location">${c.estimate.city || c.estimate.location}</div>
          </th>
        `).join("")}
      </tr>
    </thead>
    <tbody>
      <tr class="section-header">
        <td colspan="${calculations.length + 1}">Basisgegevens</td>
      </tr>
      <tr>
        <td class="label-cell">Aankoopprijs</td>
        ${calculations.map((c) => `<td>${formatCurrency(c.estimate.basePrice)}</td>`).join("")}
      </tr>
      <tr>
        <td class="label-cell">Type</td>
        ${calculations.map((c) => `<td>${c.estimate.propertyType === "nieuwbouw" ? "Nieuwbouw" : "Bestaand"}</td>`).join("")}
      </tr>
      <tr>
        <td class="label-cell">Oplevertermijn</td>
        ${calculations.map((c) => {
          if (!c.estimate.deliveryDate) return `<td style="color: #999;">—</td>`;
          return `<td style="color: #059669; font-weight: 500;">${c.estimate.deliveryDate}</td>`;
        }).join("")}
      </tr>
      <tr>
        <td class="label-cell">Bijkomende kosten</td>
        ${calculations.map((c) => `
          <td>
            ${formatCurrency(c.totalCosts)}
            <br><span style="font-size: 10px; color: #666;">(${((c.totalCosts / c.estimate.basePrice) * 100).toFixed(1)}%)</span>
          </td>
        `).join("")}
      </tr>
      <tr>
        <td class="label-cell">Subtotaal</td>
        ${calculations.map((c) => `<td style="font-weight: 500;">${formatCurrency(c.subtotalWithCosts)}</td>`).join("")}
      </tr>

      ${extraNames.length > 0 ? `
        <tr class="section-header">
          <td colspan="${calculations.length + 1}">Extra's & Meerwerk</td>
        </tr>
        ${extraNames.map((name) => `
          <tr>
            <td class="label-cell">${name}</td>
            ${calculations.map((c) => {
              const extra = c.estimate.extras.find((e) => e.name === name);
              if (!extra) return `<td style="color: #999;">—</td>`;
              if (extra.isIncluded) return `<td class="included">✓ Inclusief</td>`;
              const vatRate = extra.viaDeveloper ? 0.10 : 0.21;
              const total = extra.price * (1 + vatRate);
              return `<td>${formatCurrency(total)}<br><span style="font-size: 10px; color: #666;">incl. ${extra.viaDeveloper ? "10" : "21"}% BTW</span></td>`;
            }).join("")}
          </tr>
        `).join("")}
        <tr>
          <td class="label-cell" style="font-weight: 500;">Subtotaal extra's</td>
          ${calculations.map((c) => `
            <td style="font-weight: 500;">${c.extrasCalc.total > 0 ? formatCurrency(c.extrasCalc.total) : "—"}</td>
          `).join("")}
        </tr>
      ` : ""}

      <tr class="total-row">
        <td>Totale Investering</td>
        ${calculations.map((c) => `
          <td>
            ${formatCurrency(c.totalInvestment)}
            ${c.totalInvestment === minTotal && calculations.length > 1 ? `<br><span class="cheapest">Goedkoopst</span>` : ""}
          </td>
        `).join("")}
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <div class="footer-logo">Top Immo Spain</div>
    <div class="disclaimer">
      Deze vergelijking is vrijblijvend en onder voorbehoud. Werkelijke kosten kunnen variëren.
    </div>
  </div>
</body>
</html>
    `;
  };

  const handleDownloadComparisonPdf = () => {
    try {
      const html = generateComparisonPdfHtml();

      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();

        setTimeout(() => {
          printWindow.print();
        }, 500);
      }

      toast.success("Vergelijking PDF wordt gegenereerd");
    } catch (error) {
      console.error("Error generating comparison PDF:", error);
      toast.error("Fout bij genereren vergelijking");
    }
  };

  // Generate full report HTML with all projects and comparison
  const generateFullReportPdfHtml = (clientName?: string | null): string => {
    const today = new Date().toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // Generate individual project pages
    const projectPages = estimates.map((estimate, index) => {
      const totalCosts = calculateTotalCosts(estimate.costs);
      const extrasCalc = calculateExtrasCost(estimate.extras);
      const subtotalWithCosts = estimate.basePrice + totalCosts;
      const totalInvestment = subtotalWithCosts + extrasCalc.total;
      const percentageOfPrice = ((totalCosts / estimate.basePrice) * 100).toFixed(1);

      const costRows = [
        { label: estimate.propertyType === "nieuwbouw" ? "BTW (10%)" : `ITP (${estimate.itpRate}%)`, amount: estimate.costs.btwOrItp },
        { label: "Zegelbelasting (AJD)", amount: estimate.costs.ajd },
        { label: "Advocaatkosten", amount: estimate.costs.advocaat },
        { label: "Notariskosten", amount: estimate.costs.notaris },
        { label: "Registratiekantoor", amount: estimate.costs.registratie },
        { label: "Volmacht", amount: estimate.costs.volmacht },
        { label: "Nutsaansluitingen", amount: estimate.costs.nutsvoorzieningen },
        { label: "Bankkosten", amount: estimate.costs.bankkosten },
        { label: "Administratie", amount: estimate.costs.administratie },
        { label: "NIE-nummer", amount: estimate.costs.nie },
      ];

      const leftColumn = costRows.slice(0, 5);
      const rightColumn = costRows.slice(5);

      return `
        <div class="page project-page">
          <div class="page-number">Pagina ${index + 2}</div>
          <div class="page-number-left">Project ${index + 1} van ${estimates.length}</div>
          <div class="header">
            ${estimate.projectImage ? `<img src="${estimate.projectImage}" alt="${estimate.projectName}" class="project-image" />` : ""}
            <div class="project-info">
              <span class="project-name">${estimate.projectName.toUpperCase()}</span>
              <div class="project-meta">
                <span class="project-location">${estimate.city || estimate.location}</span>
                ${estimate.deliveryDate ? `<span class="separator">•</span><span class="delivery">Oplevering: ${estimate.deliveryDate}</span>` : ""}
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Aankoopkosten</div>
            <div class="base-price-row">
              <span>Aankoopprijs</span>
              <span>${formatCurrency(estimate.basePrice)}</span>
            </div>
            <div class="cost-grid">
              <div>
                ${leftColumn.map((row) => `<div class="cost-row"><span class="cost-label">${row.label}</span><span class="cost-amount">${formatCurrency(row.amount)}</span></div>`).join("")}
              </div>
              <div>
                ${rightColumn.map((row) => `<div class="cost-row"><span class="cost-label">${row.label}</span><span class="cost-amount">${formatCurrency(row.amount)}</span></div>`).join("")}
              </div>
            </div>
            <div class="subtotal">
              <span><span class="subtotal-label">Bijkomende kosten</span><span class="percentage">(${percentageOfPrice}%)</span></span>
              <span class="subtotal-amount">${formatCurrency(totalCosts)}</span>
            </div>
          </div>

          ${(extrasCalc.includedItems.length > 0 || extrasCalc.extraItems.length > 0) ? `
            <div class="extras-combined">
              <div class="section-title">Extra's & Meerwerk</div>
              <div class="extras-grid">
                ${extrasCalc.includedItems.slice(0, 6).map((item) => `
                  <div class="extra-item extra-included">
                    <span class="check">✓</span>
                    <span>${item.name}</span>
                    <span style="color: #059669; font-size: 9px;">(incl.)</span>
                  </div>
                `).join("")}
                ${extrasCalc.extraItems.slice(0, Math.max(0, 6 - extrasCalc.includedItems.length)).map((item) => {
                  const vatRate = item.viaDeveloper ? 0.10 : 0.21;
                  const vat = item.price * vatRate;
                  const total = item.price + vat;
                  return `
                    <div class="extra-item extra-cost">
                      <span>${item.name}</span>
                      <span class="extra-price">${formatCurrency(total)}</span>
                      <span class="extra-vat">(${item.viaDeveloper ? "10%" : "21%"} BTW)</span>
                    </div>
                  `;
                }).join("")}
                ${(extrasCalc.includedItems.length + extrasCalc.extraItems.length) > 6 ? `
                  <div class="extra-item" style="color: #666; font-style: italic;">+ ${(extrasCalc.includedItems.length + extrasCalc.extraItems.length) - 6} meer...</div>
                ` : ""}
              </div>
            </div>
          ` : ""}

          ${estimate.notes ? `
            <div class="section notes-section">
              <div class="section-title" style="color: #166534;">Opmerkingen</div>
              <p style="font-size: 10px; color: #15803d; line-height: 1.4;">${estimate.notes.length > 120 ? estimate.notes.substring(0, 120) + '...' : estimate.notes}</p>
            </div>
          ` : ""}

          <div class="summary-row">
            <div class="summary-item">
              <span class="summary-label">Bijkomende kosten:</span>
              <span class="summary-value">${formatCurrency(totalCosts)}</span>
            </div>
            ${extrasCalc.total > 0 ? `
              <div class="summary-item">
                <span class="summary-label">Extra's totaal:</span>
                <span class="summary-value">${formatCurrency(extrasCalc.total)}</span>
              </div>
            ` : ""}
          </div>

          <div class="total-section">
            <div class="total-label">Totale Investering</div>
            <div class="total-amount">${formatCurrency(totalInvestment)}</div>
          </div>
        </div>
      `;
    }).join("");

    // Generate comparison section (only if 2+ projects)
    let comparisonSection = "";
    if (estimates.length >= 2) {
      const calculations = estimates.map((est) => {
        const totalCosts = calculateTotalCosts(est.costs);
        const extrasCalc = calculateExtrasCost(est.extras);
        const subtotalWithCosts = est.basePrice + totalCosts;
        const totalInvestment = subtotalWithCosts + extrasCalc.total;
        return { estimate: est, totalCosts, extrasCalc, subtotalWithCosts, totalInvestment };
      });

      const minTotal = Math.min(...calculations.map((c) => c.totalInvestment));

      const allExtras = new Set<string>();
      estimates.forEach((est) => est.extras.forEach((e) => allExtras.add(e.name)));
      const extraNames = Array.from(allExtras);

      comparisonSection = `
        <div class="page comparison-page">
          <div class="page-number">Pagina ${estimates.length + 2}</div>
          <div class="comparison-header">
            <div class="comparison-title">Projectvergelijking</div>
            <div class="comparison-subtitle">${estimates.length} projecten vergeleken</div>
          </div>

          <table class="comparison-table${estimates.length >= 4 ? ' compact' : ''}">
            <thead>
              <tr>
                <th>Project</th>
                ${calculations.map((c) => `
                  <th class="project-header">
                    <div class="project-name">${c.estimate.projectName.toUpperCase()}</div>
                    <div class="project-location">${c.estimate.city || c.estimate.location}</div>
                  </th>
                `).join("")}
              </tr>
            </thead>
            <tbody>
              <tr class="section-header">
                <td colspan="${calculations.length + 1}">Basisgegevens</td>
              </tr>
              <tr>
                <td class="label-cell">Aankoopprijs</td>
                ${calculations.map((c) => `<td>${formatCurrency(c.estimate.basePrice)}</td>`).join("")}
              </tr>
              <tr>
                <td class="label-cell">Type</td>
                ${calculations.map((c) => `<td>${c.estimate.propertyType === "nieuwbouw" ? "Nieuwbouw" : "Bestaand"}</td>`).join("")}
              </tr>
              <tr>
                <td class="label-cell">Bijkomende kosten</td>
                ${calculations.map((c) => `<td>${formatCurrency(c.totalCosts)} <span class="percentage">(${((c.totalCosts / c.estimate.basePrice) * 100).toFixed(1)}%)</span></td>`).join("")}
              </tr>
              <tr>
                <td class="label-cell">Subtotaal</td>
                ${calculations.map((c) => `<td style="font-weight: 500;">${formatCurrency(c.subtotalWithCosts)}</td>`).join("")}
              </tr>
              ${extraNames.length > 0 ? `
                <tr class="section-header">
                  <td colspan="${calculations.length + 1}">Extra's & Meerwerk</td>
                </tr>
                ${extraNames.map((name) => `
                  <tr>
                    <td class="label-cell">${name}</td>
                    ${calculations.map((c) => {
                      const extra = c.estimate.extras.find((e) => e.name === name);
                      if (!extra) return `<td style="color: #999;">—</td>`;
                      if (extra.isIncluded) return `<td class="included">✓ Inclusief</td>`;
                      const vatRate = extra.viaDeveloper ? 0.10 : 0.21;
                      const total = extra.price * (1 + vatRate);
                      return `<td>${formatCurrency(total)}</td>`;
                    }).join("")}
                  </tr>
                `).join("")}
                <tr>
                  <td class="label-cell" style="font-weight: 500;">Subtotaal extra's</td>
                  ${calculations.map((c) => `<td style="font-weight: 500;">${c.extrasCalc.total > 0 ? formatCurrency(c.extrasCalc.total) : "—"}</td>`).join("")}
                </tr>
              ` : ""}
              <tr class="total-row">
                <td>Totale Investering</td>
                ${calculations.map((c) => `
                  <td>
                    ${formatCurrency(c.totalInvestment)}
                    ${c.totalInvestment === minTotal && calculations.length > 1 ? `<span class="cheapest">Goedkoopst</span>` : ""}
                  </td>
                `).join("")}
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }

    // Generate map section (only if we have coordinates and mapbox token)
    let mapSection = "";
    const projectsWithCoords = estimates.filter(e => e.latitude && e.longitude);
    
    if (projectsWithCoords.length > 0 && mapboxToken) {
      // Build markers for Mapbox Static API
      const markers = projectsWithCoords.map((est, idx) => 
        `pin-l-${idx + 1}+3B8EAC(${est.longitude},${est.latitude})`
      ).join(',');
      
      // Calculate bounds for auto-centering
      const lngs = projectsWithCoords.map(e => e.longitude!);
      const lats = projectsWithCoords.map(e => e.latitude!);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      
      // Add padding to bounds
      const lngPad = (maxLng - minLng) * 0.2 || 0.5;
      const latPad = (maxLat - minLat) * 0.2 || 0.5;
      const bounds = `[${minLng - lngPad},${minLat - latPad},${maxLng + lngPad},${maxLat + latPad}]`;
      
      const mapUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${markers}/${bounds}/800x450@2x?access_token=${mapboxToken}`;

      mapSection = `
        <div class="page map-page">
          <div class="page-number">Pagina ${estimates.length + (estimates.length >= 2 ? 3 : 2)}</div>
          <div class="map-header">
            <div class="map-title">Projectlocaties</div>
            <div class="map-subtitle">${projectsWithCoords.length} project${projectsWithCoords.length !== 1 ? "en" : ""} op de kaart</div>
          </div>
          
          <div class="map-container">
            <img src="${mapUrl}" alt="Projectlocaties" class="map-image" />
          </div>
          
          <div class="map-legend${projectsWithCoords.length >= 4 ? ' compact' : ''}">
            ${projectsWithCoords.map((est, idx) => `
              <div class="legend-item${projectsWithCoords.length >= 4 ? ' compact' : ''}">
                <div class="legend-number">${idx + 1}</div>
                <div class="legend-info">
                  <div class="legend-name">${est.projectName.toUpperCase()}</div>
                  <div class="legend-location">${est.city || est.location}</div>
                </div>
              </div>
            `).join("")}
          </div>
          
          <div class="map-footer">
            <img class="map-footer-logo" src="/logo-email.png" alt="Top Immo Spain" />
            <div class="map-footer-divider"></div>
            <div class="map-footer-contact">
              <span>info@topimmospain.com</span>
              <span class="map-footer-contact-divider">|</span>
              <span>+32 468 13 29 03</span>
            </div>
            <div class="map-footer-disclaimer">
              Deze indicatie is vrijblijvend en onder voorbehoud. Werkelijke kosten kunnen variëren.
            </div>
          </div>
        </div>
      `;
    }

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Kostenindicatie Rapport - ${today}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    @page { size: A4; margin: 15mm; }
    
    @media print {
      html, body { 
        margin: 0 !important; 
        padding: 0 !important; 
        -webkit-print-color-adjust: exact; 
        print-color-adjust: exact; 
      }
    }
    
    body {
      font-family: 'Inter', sans-serif;
      color: #1a1a1a;
      line-height: 1.3;
    }
    
    .page {
      page-break-after: always;
      width: 210mm;
      height: 297mm;
      max-width: 210mm;
      margin: 0 auto;
      position: relative;
      padding: 20px 25px;
    }
    
    .page:last-child {
      page-break-after: avoid;
    }
    
    /* Cover Page - CSS Grid with reserved zones */
    .cover-page {
      display: grid;
      grid-template-rows: 1fr auto 60px;
      align-items: center;
      justify-items: center;
      text-align: center;
      background: #FFFFFF;
      color: #4A3C34;
      padding: 35px 40px 0 40px;
    }
    
    .cover-main {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    
    /* Decorative border frame around page */
    .cover-page::before {
      content: '';
      position: absolute;
      top: 15px;
      left: 15px;
      right: 15px;
      bottom: 15px;
      border: 3px solid #3B8EAC;
      border-radius: 12px;
      pointer-events: none;
    }
    
    /* Inner accent line */
    .cover-page::after {
      content: '';
      position: absolute;
      top: 22px;
      left: 22px;
      right: 22px;
      bottom: 22px;
      border: 1px solid #E8DCC8;
      border-radius: 8px;
      pointer-events: none;
    }
    
    .cover-logo-img {
      max-width: 120px;
      height: auto;
      margin-bottom: 16px;
    }
    
    .cover-divider {
      width: 120px;
      height: 4px;
      background: linear-gradient(90deg, #3B8EAC 0%, #6CC1C8 100%);
      border-radius: 2px;
      margin: 12px 0 18px 0;
    }
    
    .cover-title {
      font-size: 28px;
      font-weight: 700;
      color: #4A3C34;
      margin-bottom: 6px;
      letter-spacing: -0.5px;
    }
    
    .cover-subtitle {
      font-size: 15px;
      color: #8B7355;
      margin-bottom: 12px;
      font-weight: 500;
    }
    
    .cover-meta {
      display: flex;
      flex-direction: column;
      gap: 3px;
      font-size: 13px;
      color: #8B7355;
    }
    
    .cover-client-name {
      margin-top: 16px;
      text-align: center;
    }
    
    .cover-prepared-for {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #3B8EAC;
      font-weight: 600;
      margin-bottom: 8px;
    }
    
    .cover-name {
      font-size: 24px;
      font-weight: 600;
      color: #4A3C34;
    }
    
    .cover-contact {
      display: flex;
      gap: 15px;
      font-size: 12px;
      color: #8B7355;
      align-self: center;
      padding-bottom: 15px;
    }
    
    .cover-contact-divider {
      color: #C9B99A;
    }
    
    /* Project Pages */
    .project-page {
      font-size: 12px;
    }
    
    .page-number {
      position: absolute;
      bottom: 20px;
      right: 25px;
      font-size: 10px;
      color: #8B7355;
      background: rgba(255,255,255,0.9);
      padding: 4px 10px;
      border-radius: 4px;
    }
    
    .page-number-left {
      position: absolute;
      bottom: 20px;
      left: 25px;
      font-size: 9px;
      color: #94a3b8;
    }
    
    .project-image {
      width: 100%;
      max-height: 200px;
      object-fit: cover;
      border-radius: 10px;
      margin-bottom: 10px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .header {
      text-align: center;
      margin-bottom: 10px;
    }
    
    /* project-image already defined above */
    
    .project-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    
    .project-name {
      font-size: 24px;
      font-weight: 700;
      color: #1a365d;
    }
    
    .project-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #64748b;
      font-size: 12px;
    }
    
    .separator { color: #cbd5e1; }
    .project-location { color: #64748b; }
    .delivery { color: #059669; font-weight: 500; }
    
    .section {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 8px 12px;
      margin-bottom: 6px;
    }
    
    .section-title {
      font-size: 11px;
      font-weight: 600;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    
    .base-price-row {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      font-weight: 600;
      padding-bottom: 6px;
      margin-bottom: 6px;
      border-bottom: 1px solid #ddd;
    }
    
    .cost-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0 20px;
    }
    
    .cost-row {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
      font-size: 11px;
    }
    
    .cost-label { color: #666; }
    .cost-amount { font-weight: 500; }
    
    .subtotal {
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px solid #ddd;
      display: flex;
      justify-content: space-between;
      font-size: 12px;
    }
    
    .subtotal-label { font-weight: 600; }
    .subtotal-amount { font-weight: 700; color: #2563eb; }
    .percentage { font-size: 10px; color: #999; margin-left: 5px; }
    
    .extras-combined {
      background: linear-gradient(135deg, #fef7ed 0%, #fef3e2 100%);
      border-radius: 8px;
      padding: 8px 12px;
      margin-bottom: 6px;
      border: 1px solid #fed7aa;
    }
    
    .extras-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 15px;
    }
    
    .extra-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
    }
    
    .extra-included { color: #059669; }
    .extra-included .check { color: #10b981; font-weight: bold; }
    .extra-cost { color: #92400e; }
    .extra-price { font-weight: 600; }
    .extra-vat { font-size: 9px; color: #a16207; }
    
    .notes-section {
      background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
      border: 1px solid #bbf7d0;
    }
    
    .summary-row {
      display: flex;
      justify-content: space-between;
      background: #f0f9ff;
      border-radius: 6px;
      padding: 7px 12px;
      margin-bottom: 6px;
      font-size: 12px;
    }
    
    .summary-item {
      display: flex;
      gap: 8px;
    }
    
    .summary-label { color: #666; }
    .summary-value { font-weight: 600; color: #1e40af; }
    
    .total-section {
      background: linear-gradient(135deg, #1e3a5f 0%, #0f2942 100%);
      color: white;
      text-align: center;
      padding: 12px;
      border-radius: 10px;
      box-shadow: 0 2px 8px rgba(30, 58, 95, 0.3);
    }
    
    .total-label {
      font-size: 12px;
      opacity: 0.9;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .total-amount {
      font-size: 26px;
      font-weight: 700;
      margin-top: 2px;
    }
    
    /* Comparison Page */
    .comparison-page {
      padding: 30px;
    }
    
    .comparison-header {
      text-align: center;
      margin-bottom: 25px;
    }
    
    .comparison-title {
      font-size: 24px;
      font-weight: 700;
      color: #1a365d;
    }
    
    .comparison-subtitle {
      font-size: 14px;
      color: #64748b;
      margin-top: 5px;
    }
    
    .comparison-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    
    .comparison-table th, .comparison-table td {
      padding: 8px 6px;
      border-bottom: 1px solid #e5e5e5;
      text-align: center;
    }
    
    /* Compact layout for 4+ projects */
    .comparison-table.compact th, .comparison-table.compact td {
      padding: 6px 4px;
      font-size: 10px;
    }
    
    .comparison-table th {
      background: #f8f9fa;
      font-weight: 600;
    }
    
    .comparison-table th:first-child, .comparison-table td:first-child {
      text-align: left;
    }
    
    .comparison-table .project-header {
      padding: 10px 6px;
    }
    
    .comparison-table .project-header .project-name {
      font-size: 11px;
      font-weight: 600;
      color: #1a365d;
    }
    
    .comparison-table .project-header .project-location {
      font-size: 9px;
      color: #64748b;
    }
    
    .comparison-table .section-header {
      background: #f1f5f9;
      font-weight: 600;
      color: #475569;
    }
    
    .comparison-table .label-cell {
      color: #666;
    }
    
    .comparison-table .included {
      color: #10b981;
      font-weight: 500;
    }
    
    .comparison-table .total-row {
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
    }
    
    .comparison-table .total-row td {
      font-weight: 700;
      font-size: 13px;
      color: #1d4ed8;
    }
    
    .cheapest {
      background: #dcfce7;
      color: #15803d;
      font-size: 9px;
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-block;
      margin-left: 6px;
    }
    
    /* Footer - NOT fixed, only at end of document */
    .report-footer {
      text-align: center;
      margin-top: 40px;
      padding: 25px 30px;
      background: linear-gradient(135deg, #FAF8F5 0%, #E8DCC8 50%, #FAF8F5 100%);
      border-top: 3px solid #3B8EAC;
    }
    
    .report-footer-logo {
      font-weight: 700;
      font-size: 16px;
      color: #4A3C34;
      margin-bottom: 8px;
    }
    
    .report-footer-contact {
      font-size: 11px;
      color: #8B7355;
      margin-bottom: 10px;
    }
    
    .report-disclaimer {
      font-size: 9px;
      color: #8B7355;
      font-style: italic;
    }
    
    /* Hide report-footer on cover page */
    .cover-page ~ .report-footer {
      display: block;
    }
    
    /* Map Page */
    .map-page {
      padding: 30px;
    }
    
    .map-header {
      text-align: center;
      margin-bottom: 25px;
    }
    
    .map-title {
      font-size: 24px;
      font-weight: 700;
      color: #1a365d;
    }
    
    .map-subtitle {
      font-size: 14px;
      color: #64748b;
      margin-top: 5px;
    }
    
    .map-container {
      margin-bottom: 25px;
    }
    
    .map-image {
      width: 100%;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    
    .map-legend {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 10px;
    }
    
    /* Compact legend for 4+ projects */
    .map-legend.compact {
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    
    .legend-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #e5e5e5;
    }
    
    .legend-item.compact {
      padding: 8px;
      gap: 8px;
    }
    
    .legend-number {
      width: 28px;
      height: 28px;
      background: linear-gradient(135deg, #3B8EAC 0%, #6CC1C8 100%);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 12px;
      flex-shrink: 0;
    }
    
    .legend-info {
      flex: 1;
      min-width: 0;
    }
    
    .legend-name {
      font-weight: 600;
      font-size: 12px;
      color: #4A3C34;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .legend-location {
      font-size: 10px;
      color: #8B7355;
      margin-top: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    /* Map Page Footer - Same style as cover page */
    .map-footer {
      margin-top: 25px;
      padding: 25px 30px;
      background: #FFFFFF;
      border-radius: 12px;
      border: 3px solid #3B8EAC;
      position: relative;
      text-align: center;
    }
    
    /* Inner accent border like cover page */
    .map-footer::before {
      content: '';
      position: absolute;
      top: 6px;
      left: 6px;
      right: 6px;
      bottom: 6px;
      border: 1px solid #E8DCC8;
      border-radius: 8px;
      pointer-events: none;
    }
    
    .map-footer-logo {
      max-width: 100px;
      height: auto;
      margin-bottom: 12px;
    }
    
    .map-footer-divider {
      width: 60px;
      height: 3px;
      background: linear-gradient(90deg, #3B8EAC 0%, #6CC1C8 100%);
      border-radius: 2px;
      margin: 0 auto 12px auto;
    }
    
    .map-footer-contact {
      display: flex;
      justify-content: center;
      gap: 15px;
      font-size: 11px;
      color: #8B7355;
      margin-bottom: 10px;
    }
    
    .map-footer-contact-divider {
      color: #C9B99A;
    }
    
    .map-footer-disclaimer {
      font-size: 9px;
      color: #8B7355;
      font-style: italic;
    }
  </style>
</head>
<body>
  <!-- Cover Page -->
  <div class="page cover-page">
    <div class="cover-main">
      <img class="cover-logo-img" src="/logo-email.png" alt="Top Immo Spain" />
      
      <div class="cover-divider"></div>
      
      <div class="cover-title">Kostenindicatie Rapport</div>
      <div class="cover-subtitle">Overzicht investering Spanje</div>
      
      <div class="cover-meta">
        <span>${today}</span>
        <span>${estimates.length} project${estimates.length !== 1 ? "en" : ""} in dit rapport</span>
      </div>
      
      ${clientName ? `
      <div class="cover-client-name">
        <div class="cover-prepared-for">Opgesteld voor</div>
        <div class="cover-name">${clientName}</div>
      </div>
      ` : ''}
    </div>
    
    <div></div>
    
    <div class="cover-contact">
      <span>info@topimmospain.com</span>
      <span class="cover-contact-divider">|</span>
      <span>+32 468 13 29 03</span>
    </div>
  </div>

  <!-- Project Pages -->
  ${projectPages}

  <!-- Comparison Page (if 2+ projects) -->
  ${comparisonSection}

  <!-- Map Page (if coordinates available) -->
  ${mapSection}
</body>
</html>
    `;
  };

  const handleDownloadFullReport = (clientName?: string | null) => {
    try {
      const html = generateFullReportPdfHtml(clientName);

      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();

        setTimeout(() => {
          printWindow.print();
        }, 800);
      }

      toast.success("Volledig rapport wordt gegenereerd");
    } catch (error) {
      console.error("Error generating full report:", error);
      toast.error("Fout bij genereren rapport");
    }
  };

  const handleFullReportClick = () => {
    setClientDialogOpen(true);
  };

  const handleClientSelected = async (clientId: string | null) => {
    setSelectedClientId(clientId);
    if (clientId) {
      const { data } = await supabase
        .from('crm_leads')
        .select('first_name, last_name')
        .eq('id', clientId)
        .single();
      if (data) {
        const name = [data.first_name, data.last_name].filter(Boolean).join(' ');
        setSelectedClientName(name || null);
      }
    } else {
      setSelectedClientName(null);
    }
  };

  const handleGenerateReport = () => {
    setClientDialogOpen(false);
    handleDownloadFullReport(selectedClientName);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="h-6 w-6" />
            Kostenindicatie Tool
          </h1>
          <p className="text-muted-foreground">
            Bereken de totale investering en vergelijk projecten
          </p>
        </div>

        {/* Editing indicator */}
        {editingScenarioName && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="bg-primary/20 text-primary">
                Bewerken
              </Badge>
              <span className="font-medium">Je bewerkt: {editingScenarioName}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={cancelEditing}>
              <X className="h-4 w-4 mr-1" />
              Annuleren
            </Button>
          </div>
        )}

        {/* Add Project */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project toevoegen</CardTitle>
            <CardDescription>
              Selecteer een project om een kostenindicatie te maken (max. 5)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Select
                value={selectedProjectId}
                onValueChange={setSelectedProjectId}
                disabled={estimates.length >= 5}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecteer een project..." />
                </SelectTrigger>
                <SelectContent>
                  {availableProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name} - {project.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleAddProject}
                disabled={!selectedProjectId || estimates.length >= 5}
              >
                <Plus className="h-4 w-4 mr-1" />
                Toevoegen
              </Button>
              {estimates.length > 0 && (
                <>
                  {editingScenarioName ? (
                    <>
                      <Button 
                        variant="default" 
                        onClick={handleSaveChanges}
                        disabled={isUpdating}
                      >
                        {isUpdating ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-1" />
                        )}
                        Wijzigingen opslaan
                      </Button>
                      <Button variant="outline" onClick={cancelEditing}>
                        <X className="h-4 w-4 mr-1" />
                        Annuleren
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => setSaveDialogOpen(true)}>
                        <Save className="h-4 w-4 mr-1" />
                        Opslaan
                      </Button>
                      <Button variant="outline" onClick={clearAll}>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Wissen
                      </Button>
                    </>
                  )}
                </>
              )}
              <Button variant="secondary" onClick={() => setScenariosSheetOpen(true)}>
                <FolderOpen className="h-4 w-4 mr-1" />
                Scenario's
              </Button>
              {estimates.length > 0 && (
                <Button 
                  variant="default" 
                  onClick={handleFullReportClick}
                  className="bg-primary"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Volledig Rapport
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Project Cards */}
        {estimates.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {estimates.map((estimate, index) => (
              <div
                key={estimate.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onDragLeave={handleDragLeave}
                className={`relative transition-all duration-200 ${
                  draggedIndex === index ? "opacity-50" : ""
                } ${
                  dragOverIndex === index && draggedIndex !== index
                    ? "ring-2 ring-primary ring-offset-2 rounded-lg"
                    : ""
                }`}
              >
                {/* Drag Handle */}
                <div className="absolute -left-2 top-4 z-10 cursor-grab active:cursor-grabbing bg-background border rounded-md p-1 shadow-sm hover:bg-muted transition-colors">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>
                <CostEstimatorCard
                  estimate={estimate}
                  onUpdate={(updates) => updateEstimate(estimate.id, updates)}
                  onRemove={() => removeEstimate(estimate.id)}
                  onAddExtra={(extra) => addExtra(estimate.id, extra)}
                  onUpdateExtra={(extraId, updates) =>
                    updateExtra(estimate.id, extraId, updates)
                  }
                  onRemoveExtra={(extraId) => removeExtra(estimate.id, extraId)}
                  onDownloadPdf={() => handleDownloadPdf(estimate)}
                />
              </div>
            ))}
          </div>
        )}

        {/* Comparison Table */}
        {estimates.length >= 2 && (
          <CostEstimatorComparison
            estimates={estimates}
            onDownloadComparisonPdf={handleDownloadComparisonPdf}
          />
        )}

        {/* Empty State */}
        {estimates.length === 0 && (
          <Card className="py-12">
            <CardContent className="text-center">
              <Calculator className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="font-semibold mb-2">Geen projecten geselecteerd</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Selecteer een project hierboven om een kostenindicatie te maken.
                Je kunt tot 5 projecten toevoegen en vergelijken.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialogs */}
      <SaveAndAssignCostEstimateDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        estimates={estimates}
      />
      <CostEstimatesSheet
        open={scenariosSheetOpen}
        onOpenChange={setScenariosSheetOpen}
        onEdit={handleEditScenario}
      />
      <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rapport genereren</DialogTitle>
            <DialogDescription>
              Selecteer optioneel een klant voor op de coverpagina.
            </DialogDescription>
          </DialogHeader>
          <CustomerSearch onSelect={handleClientSelected} selectedId={selectedClientId} />
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setSelectedClientId(null); setSelectedClientName(null); handleGenerateReport(); }}>
              Zonder klant
            </Button>
            <Button onClick={handleGenerateReport} disabled={!selectedClientId}>
              Genereer rapport
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
