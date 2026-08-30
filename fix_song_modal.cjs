const fs = require('fs');
let code = fs.readFileSync('src/components/ConfessionBoard.tsx', 'utf8');

// The song modal ends with:
//               </div>
//             </motion.div>
//           </div>
//         , document.body)}
// Let's replace the </motion.div> with </div>

code = code.replace(
  '</motion.div>\n        </div>\n      , document.body)}\n      \n      {showSongModal',
  '</div>\n        </div>\n      , document.body)}\n      \n      {showSongModal'
);
// Wait, is it before showSongModal or inside showSongModal?
// The error says:
// 329|                ))}
// 330|              </div>
// 331|            </motion.div>
// 332|          </div>
// 333|        , document.body)}

code = code.replace(
  `                ))}\n              </div>\n            </motion.div>\n          </div>\n        , document.body)}`,
  `                ))}\n              </div>\n            </div>\n          </div>\n        , document.body)}`
);

fs.writeFileSync('src/components/ConfessionBoard.tsx', code);
