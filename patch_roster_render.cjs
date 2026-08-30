const fs = require('fs');
let code = fs.readFileSync('src/components/Roster.tsx', 'utf8');

const oldAdminButtons = `{isAdmin && (
                <button onClick={(e) => { e.stopPropagation(); handleDelete(student.id!); }} className="absolute top-1 right-1 sm:top-2 sm:right-2 text-black hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-50 bg-white border border-black rounded-full p-0.5 sm:p-1 shadow-[1px_1px_0_0_var(--color-black)]">
                  <Trash2 size={12} className="sm:w-3.5 sm:h-3.5" />
                </button>
              )}`;
              
const newAdminButtons = `{isAdmin && (
                <div className="absolute top-1 right-1 sm:top-2 sm:right-2 flex flex-col gap-1 z-50 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => handleEditClick(e, student)} className="text-black hover:text-neo-blue bg-white border border-black rounded-full p-0.5 sm:p-1 shadow-[1px_1px_0_0_var(--color-black)]" title="Edit Student">
                    <Edit2 size={12} className="sm:w-3.5 sm:h-3.5" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(student.id!); }} className="text-black hover:text-red-500 bg-white border border-black rounded-full p-0.5 sm:p-1 shadow-[1px_1px_0_0_var(--color-black)]" title="Delete Student">
                    <Trash2 size={12} className="sm:w-3.5 sm:h-3.5" />
                  </button>
                </div>
              )}`;

code = code.replace(oldAdminButtons, newAdminButtons);

const skeletonHtml = `
      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white texture-polkadot border-2 sm:border-4 border-black p-2 sm:p-3 pb-3 sm:pb-4 flex flex-col shadow-[4px_4px_0_0_var(--color-black)] sm:shadow-[6px_6px_0_0_var(--color-black)]">
              <div className="border-2 sm:border-4 border-black aspect-[4/5] bg-gray-200 animate-pulse mb-2 sm:mb-3"></div>
              <div className="flex flex-col flex-1 bg-white p-1">
                <div className="h-4 bg-gray-200 animate-pulse w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 animate-pulse w-1/2 mb-1"></div>
                <div className="h-3 bg-gray-200 animate-pulse w-full mt-auto"></div>
              </div>
            </div>
          ))}
        </div>
      )}
`;

code = code.replace(
  '{filteredStudents.map((student) => {',
  skeletonHtml + '\n        {!loading && filteredStudents.map((student) => {'
);
code = code.replace(
  '{filteredStudents.length === 0 && (',
  '{!loading && filteredStudents.length === 0 && ('
);
code = code.replace(
  'filteredStudents.length === 0 && (',
  '!loading && filteredStudents.length === 0 && ('
); // just in case it has slightly different spacing

fs.writeFileSync('src/components/Roster.tsx', code);
