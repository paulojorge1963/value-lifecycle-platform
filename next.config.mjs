/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // ExcelJS / docx are CommonJS libs used only in server actions & route handlers.
  serverExternalPackages: ["exceljs", "docx"],
};

export default nextConfig;
