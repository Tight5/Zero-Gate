
export interface ExcelData {
  sheets: Record<string, any[]>;
  metadata: {
    fileName: string;
    sheetNames: string[];
    totalRows: number;
  };
}

export class ExcelProcessor {
  static async processFile(file: File): Promise<ExcelData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          if (!data) throw new Error('No data found');

          // This would typically use a library like xlsx
          // For now, we'll simulate the processing
          const mockData: ExcelData = {
            sheets: {
              'Sheet1': [
                { name: 'John Doe', email: 'john@example.com', type: 'entrepreneur' },
                { name: 'Jane Smith', email: 'jane@example.com', type: 'organization' },
              ]
            },
            metadata: {
              fileName: file.name,
              sheetNames: ['Sheet1'],
              totalRows: 2,
            }
          };

          resolve(mockData);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  static validateData(data: any[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    data.forEach((row, index) => {
      if (!row.name) errors.push(`Row ${index + 1}: Name is required`);
      if (!row.email) errors.push(`Row ${index + 1}: Email is required`);
      if (!row.type) errors.push(`Row ${index + 1}: Type is required`);
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  static transformToEntities(data: any[]): any[] {
    return data.map(row => ({
      name: row.name?.trim(),
      email: row.email?.trim()?.toLowerCase(),
      type: row.type?.trim()?.toLowerCase(),
      phone: row.phone?.trim(),
      organization: row.organization?.trim(),
      location: row.location?.trim(),
    }));
  }
}
