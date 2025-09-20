// Mock function for exporting service templates
export const exportServiceTemplates = async (templates) => {
  try {
    // Create a simple CSV export
    const csvContent = templates.map(template => 
      `${template.name},${template.description},${template.category}`
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'service-templates.csv';
    link.click();
    window.URL.revokeObjectURL(url);
    
    return { success: true };
  } catch (error) {
    console.error('Error exporting templates:', error);
    return { success: false, error: error.message };
  }
};




