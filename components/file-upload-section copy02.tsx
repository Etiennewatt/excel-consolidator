"use client";
import { useState } from "react";
import * as XLSX from "xlsx";

function FileUploadSection() {
  const [data, setData] = useState([]);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      const arrayBuffer = e.target?.result;
      const workbook = XLSX.read(arrayBuffer, { type: "array", cellNF: true, cellDates: false });

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      let jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
      
      jsonData = jsonData.map((row) => {
        const newRow = {};
        for (const [key, value] of Object.entries(row)) {
          newRow[String(key)] = String(value);
        }
        return newRow;
      });
      
      setData(jsonData);
      console.log("Résultat :", jsonData[0]);
    };
    
    reader.readAsArrayBuffer(file);
  };

  console.log({data: data.length})

  return (
    <div className="p-4">
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFile}
        className="mb-4"
      />

      {data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="border-collapse border border-gray-400 w-full">
            <thead>
              <tr>
                {Object.keys(data[0]).map((key) => (
                  <th key={key} className="border p-2 bg-gray-200">
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={idx}>
                  {Object.values(row).map((value, colIdx) => (
                    <td key={colIdx} className="border p-2">
                      {value?.toString()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default FileUploadSection;