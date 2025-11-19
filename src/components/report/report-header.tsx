
'use client';

export const ReportHeader = () => {
    const letterheadData = {
        instansi: process.env.NEXT_PUBLIC_KOP_INSTANSI || 'PEMERINTAH KABUPATEN CILACAP',
        skpd: process.env.NEXT_PUBLIC_KOP_SKPD || 'KECAMATAN GANDRUNGMANGU',
        alamat: process.env.NEXT_PUBLIC_KOP_ALAMAT || 'Jalan Pertiwi Nomor 1 Gandrungmangu, Gandrungmangu, Cilacap, Jawa Tengah 53254',
        telepon: process.env.NEXT_PUBLIC_KOP_TELP || '(0280)6260733',
        fax: process.env.NEXT_PUBLIC_KOP_FAX || '(0280)6260733',
        website: process.env.NEXT_PUBLIC_KOP_WEBSITE || 'www.gandrungmangu.cilacapkab.go.id',
        email: process.env.NEXT_PUBLIC_KOP_EMAIL || 'kecamatan.gandrungmangu2020@gmail.com'
    };
    // Menggunakan path lokal dari folder /public. Ini lebih andal daripada URL eksternal.
    const logoUrl = "/logo-cilacap.png";

    return (
        <div className="mb-4">
            <div className="flex items-start gap-4 pb-2">
                <img src={logoUrl} alt="Logo Instansi" width={80} className="print:w-20" />
                <div className="text-center flex-grow" style={{ lineHeight: 1.1 }}>
                    <p className="font-semibold uppercase" style={{ fontSize: '14pt' }}>{letterheadData.instansi}</p>
                    <p className="font-bold uppercase" style={{ fontSize: '22pt' }}>{letterheadData.skpd}</p>
                    <div style={{ fontSize: '9pt' }}>
                        <p>{letterheadData.alamat}</p>
                        <p>
                            <span>Telepon: {letterheadData.telepon}</span>
                            <span className="mx-2">,</span>
                            <span>Faksimile: {letterheadData.fax}</span>
                        </p>
                        <p>
                            <span>Laman: {letterheadData.website}</span>
                            <span className="mx-2">,</span>
                            <span>Pos-el: {letterheadData.email}</span>
                        </p>
                    </div>
                </div>
            </div>
            <div className="border-t-[3px] border-black"></div>
            <div className="border-t-[1px] border-black mt-1"></div>
        </div>
    );
};
