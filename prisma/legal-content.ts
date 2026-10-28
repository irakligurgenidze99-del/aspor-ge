/**
 * Legal page copy (privacy, terms, cookies) — shared by the seed and by
 * content-ops (which applies it to an existing database once).
 *
 * Structure follows the published policies of gstore.ge (privacy / terms),
 * adapted to what aspor.ge actually does: a B2B catalogue with partner
 * accounts, no online checkout, no payments on the site.
 *
 * Company details are NOT hard-coded. `{{company.name}}`, `{{company.code}}`,
 * `{{company.address}}`, `{{contact.email}}`, `{{contact.phone}}` are filled at
 * render time from Admin → პარამეტრები (src/lib/legal-tokens.ts).
 */
export const LEGAL_UPDATED = '28.10.2026';

const L = (ka: string, en: string) => ({ ka, en });

const CONTROLLER_KA = `<p><strong>{{company.name}}</strong>, საიდენტიფიკაციო კოდი: {{company.code}}, მისამართი: {{company.address}}.<br>ელფოსტა: {{contact.email}}, ტელეფონი: {{contact.phone}}.</p>`;
const CONTROLLER_EN = `<p><strong>{{company.name}}</strong>, identification code: {{company.code}}, address: {{company.address}}.<br>Email: {{contact.email}}, phone: {{contact.phone}}.</p>`;

export const PRIVACY_SECTIONS = [
  {
    type: 'RichText',
    data: {
      heading: L('კონფიდენციალურობის პოლიტიკა', 'Privacy policy'),
      body: L(
        `<p><em>ბოლო განახლება: ${LEGAL_UPDATED}</em></p>
<p>ეს პოლიტიკა განმარტავს, როგორ აგროვებს, იყენებს და იცავს ASPOR-ის ვებგვერდი (aspor.ge, შემდგომში „საიტი“) პერსონალურ მონაცემებს. მონაცემები მუშავდება „პერსონალურ მონაცემთა დაცვის შესახებ“ საქართველოს კანონის შესაბამისად.</p>
<h2>1. მონაცემთა დამუშავებისთვის პასუხისმგებელი პირი</h2>
${CONTROLLER_KA}
<h2>2. რა მონაცემებს ვაგროვებთ</h2>
<ul>
<li><strong>პარტნიორობის განაცხადი:</strong> კომპანიის დასახელება, საიდენტიფიკაციო კოდი, საკონტაქტო პირის სახელი და გვარი, ტელეფონი, ელფოსტა და დამატებითი ინფორმაცია, რომელსაც თავად მიუთითებთ.</li>
<li><strong>პარტნიორის ანგარიში:</strong> ზემოთ ჩამოთვლილი მონაცემები, კომპანიის მისამართი (თუ მიუთითებთ), ელფოსტა და პაროლი (ინახება მხოლოდ დაშიფრული ჰეშის სახით — ჩვენ თქვენს პაროლს ვერ ვხედავთ).</li>
<li><strong>საკონტაქტო ფორმა:</strong> სახელი, ელფოსტა, ტელეფონი (არასავალდებულო), თემა და შეტყობინების ტექსტი.</li>
<li><strong>ტექნიკური მონაცემები:</strong> ანგარიშში შესვლისას — IP მისამართი, ბრაუზერის ტიპი და სესიის დრო; ფორმების გაგზავნისას — IP მისამართის ჰეში (შეუქცევადად გარდაქმნილი), რომელიც გამოიყენება მხოლოდ უსაფრთხოებისა და სპამისგან დაცვისთვის.</li>
<li><strong>Cookie-ები:</strong> იხ. <a href="/ka/cookies">Cookie პოლიტიკა</a>.</li>
</ul>
<p>საიტზე არ ხდება ონლაინ გადახდა და საბანკო ბარათის მონაცემებს არ ვაგროვებთ.</p>
<h2>3. დამუშავების მიზნები და სამართლებრივი საფუძველი</h2>
<ul>
<li>პარტნიორობის განაცხადის განხილვა, პარტნიორის ანგარიშის შექმნა და მართვა, საბითუმო ფასებზე წვდომის მიცემა — ხელშეკრულების დადებისა და შესრულებისთვის აუცილებელი დამუშავება და თქვენი თანხმობა, რომელსაც განაცხადის გაგზავნისას აცხადებთ;</li>
<li>შეტყობინებებზე პასუხი და კომუნიკაცია განაცხადისა და თანამშრომლობის შესახებ — თქვენი თანხმობა;</li>
<li>ანგარიშის აქტივაციისა და პაროლის აღდგენის ელფოსტების გაგზავნა — ხელშეკრულების შესრულება;</li>
<li>საიტის უსაფრთხოება, თაღლითობისა და სპამის პრევენცია — ჩვენი კანონიერი ინტერესი;</li>
<li>საიტის გამოყენების ანალიზი და მარკეტინგი (Google Analytics, Meta Pixel) — მხოლოდ თქვენი თანხმობით, რომლის გამოხმობაც ნებისმიერ დროს შეგიძლიათ;</li>
<li>კანონით დაკისრებული მოვალეობების შესრულება.</li>
</ul>
<h2>4. ვის ვუზიარებთ მონაცემებს</h2>
<p>პერსონალურ მონაცემებს არ ვყიდით. მონაცემებს ვუზიარებთ მხოლოდ იმ მომსახურების მიმწოდებლებს (დამმუშავებლებს), რომლებიც საიტის მუშაობისთვისაა საჭირო და მხოლოდ საჭირო მოცულობით:</p>
<ul>
<li>Vercel Inc. — ჰოსტინგი და ფაილების საცავი (სერვერები ევროკავშირში, ფრანკფურტი);</li>
<li>Neon Inc. — მონაცემთა ბაზა (სერვერები ევროკავშირში, ფრანკფურტი);</li>
<li>Resend — სისტემური ელფოსტების გაგზავნა (ანგარიშის აქტივაცია, პაროლის აღდგენა, განაცხადის სტატუსი);</li>
<li>Google (Google Analytics) და Meta Platforms (Meta Pixel) — მხოლოდ თქვენი თანხმობის შემთხვევაში.</li>
</ul>
<p>ზოგიერთი მიმწოდებელი რეგისტრირებულია ან მონაცემებს ამუშავებს საქართველოს ფარგლებს გარეთ (მათ შორის აშშ-ში). ასეთ შემთხვევაში მონაცემთა გადაცემა ხორციელდება კანონით დადგენილი გარანტიების დაცვით. მონაცემები შეიძლება გადაეცეს სახელმწიფო ორგანოს მხოლოდ კანონით გათვალისწინებულ შემთხვევაში.</p>
<h2>5. შენახვის ვადა</h2>
<ul>
<li>პარტნიორის ანგარიშის მონაცემები ინახება თანამშრომლობის განმავლობაში, ხოლო მისი დასრულების შემდეგ — მხოლოდ იმ ვადით, რაც საჭიროა კანონით დადგენილი ვალდებულებების შესასრულებლად ან შესაძლო დავის გადასაწყვეტად;</li>
<li>უარყოფილი განაცხადები და საკონტაქტო შეტყობინებები ინახება მხოლოდ იმდენ ხანს, რამდენიც საჭიროა მიმოწერისა და განმეორებითი მიმართვის განსახილველად;</li>
<li>სესიები იშლება გამოსვლისას ან ვადის ამოწურვისას (პარტნიორი — 30 დღე, ადმინისტრატორი — 12 საათი);</li>
<li>მიზნის მიღწევის შემდეგ მონაცემები იშლება ან ნადგურდება, ან ინახება ისე, რომ პირის იდენტიფიცირება შეუძლებელი იყოს.</li>
</ul>
<h2>6. მონაცემთა დაცვა</h2>
<p>ვიყენებთ შესაბამის ტექნიკურ და ორგანიზაციულ ზომებს: დაშიფრული კავშირი (HTTPS), პაროლების დაცული ჰეშირება, ადმინისტრატორის ორფაქტორიანი ავტორიზაცია, წვდომის შეზღუდვა და მოქმედებების აღრიცხვა. ანგარიშის მონაცემების (პაროლის) უსაფრთხოდ შენახვაზე პასუხისმგებელი ხართ თქვენც.</p>
<h2>7. თქვენი უფლებები</h2>
<p>უფლება გაქვთ:</p>
<ul>
<li>მიიღოთ ინფორმაცია თქვენი მონაცემების დამუშავების შესახებ და გაეცნოთ მათ ან მიიღოთ მათი ასლი;</li>
<li>მოითხოვოთ არაზუსტი ან არასრული მონაცემების გასწორება, განახლება ან შევსება;</li>
<li>მოითხოვოთ დამუშავების შეწყვეტა, მონაცემების წაშლა ან განადგურება;</li>
<li>მოითხოვოთ დამუშავების დაბლოკვა;</li>
<li>მოითხოვოთ მონაცემების გადატანა (როცა ეს ტექნიკურად შესაძლებელია);</li>
<li>ნებისმიერ დროს გამოიხმოთ თანხმობა — ეს არ მოქმედებს გამოხმობამდე განხორციელებული დამუშავების კანონიერებაზე;</li>
<li>მიმართოთ საჩივრით <strong>პერსონალურ მონაცემთა დაცვის სამსახურს</strong> (personaldata.ge) ან სასამართლოს.</li>
</ul>
<p>მოთხოვნის გასაგზავნად მოგვწერეთ: {{contact.email}}. მოთხოვნას ვუპასუხებთ კანონით დადგენილ ვადაში (არაუგვიანეს 10 სამუშაო დღისა). შესაძლოა გთხოვოთ ვინაობის დადასტურება.</p>
<h2>8. ცვლილებები</h2>
<p>პოლიტიკა შეიძლება განახლდეს. მოქმედი ვერსია ყოველთვის ამ გვერდზეა გამოქვეყნებული და მითითებულია ბოლო განახლების თარიღი. არსებითი ცვლილებების შესახებ პარტნიორებს ელფოსტით შევატყობინებთ.</p>
<h2>9. კონტაქტი</h2>
<p>ელფოსტა: {{contact.email}}<br>ტელეფონი: {{contact.phone}}</p>`,
        `<p><em>Last updated: ${LEGAL_UPDATED}</em></p>
<p>This policy explains how the ASPOR website (aspor.ge, the “Site”) collects, uses and protects personal data. Data is processed in accordance with the Law of Georgia on Personal Data Protection.</p>
<h2>1. Data controller</h2>
${CONTROLLER_EN}
<h2>2. What we collect</h2>
<ul>
<li><strong>Partner application:</strong> company name, identification code, contact person’s name, phone, email and any additional information you provide.</li>
<li><strong>Partner account:</strong> the data above, company address (if provided), email and password (stored only as a one-way hash — we cannot see your password).</li>
<li><strong>Contact form:</strong> name, email, phone (optional), subject and message.</li>
<li><strong>Technical data:</strong> when you sign in — IP address, browser type and session time; when you submit a form — an irreversible hash of your IP address, used only for security and spam prevention.</li>
<li><strong>Cookies:</strong> see the <a href="/en/cookies">Cookie policy</a>.</li>
</ul>
<p>The Site takes no online payments and does not collect payment card data.</p>
<h2>3. Purposes and legal basis</h2>
<ul>
<li>Reviewing partner applications, creating and managing partner accounts, giving access to wholesale prices — processing necessary to enter into and perform a contract, and the consent you give when submitting the application;</li>
<li>Answering messages and communicating about applications and cooperation — your consent;</li>
<li>Sending account activation and password reset emails — performance of a contract;</li>
<li>Site security, fraud and spam prevention — our legitimate interest;</li>
<li>Usage analytics and marketing (Google Analytics, Meta Pixel) — only with your consent, which you may withdraw at any time;</li>
<li>Complying with legal obligations.</li>
</ul>
<h2>4. Who we share data with</h2>
<p>We do not sell personal data. We share it only with service providers (processors) needed to run the Site, and only to the extent necessary:</p>
<ul>
<li>Vercel Inc. — hosting and file storage (servers in the EU, Frankfurt);</li>
<li>Neon Inc. — database (servers in the EU, Frankfurt);</li>
<li>Resend — system emails (account activation, password reset, application status);</li>
<li>Google (Google Analytics) and Meta Platforms (Meta Pixel) — only with your consent.</li>
</ul>
<p>Some providers are established or process data outside Georgia (including the USA). Such transfers are made with the safeguards required by law. Data may be disclosed to public authorities only where the law requires it.</p>
<h2>5. Retention</h2>
<ul>
<li>Partner account data is kept for the duration of the cooperation and afterwards only as long as needed to meet legal obligations or resolve possible disputes;</li>
<li>Rejected applications and contact messages are kept only as long as needed to handle the correspondence and any repeat request;</li>
<li>Sessions are deleted on sign-out or expiry (partner — 30 days, administrator — 12 hours);</li>
<li>Once the purpose is achieved, data is deleted or destroyed, or stored in a form that no longer identifies the person.</li>
</ul>
<h2>6. Security</h2>
<p>We use appropriate technical and organisational measures: encrypted connections (HTTPS), secure password hashing, two-factor authentication for administrators, access restriction and activity logging. You are also responsible for keeping your account password safe.</p>
<h2>7. Your rights</h2>
<p>You have the right to:</p>
<ul>
<li>be informed about the processing of your data and access it or receive a copy;</li>
<li>request correction, updating or completion of inaccurate or incomplete data;</li>
<li>request that processing stop and that the data be deleted or destroyed;</li>
<li>request that processing be blocked;</li>
<li>request data portability (where technically feasible);</li>
<li>withdraw consent at any time, without affecting the lawfulness of processing before withdrawal;</li>
<li>lodge a complaint with the <strong>Personal Data Protection Service of Georgia</strong> (personaldata.ge) or a court.</li>
</ul>
<p>To make a request, write to {{contact.email}}. We will reply within the period set by law (no later than 10 working days). We may ask you to confirm your identity.</p>
<h2>8. Changes</h2>
<p>This policy may be updated. The current version is always published on this page with its last-updated date. Partners will be notified of material changes by email.</p>
<h2>9. Contact</h2>
<p>Email: {{contact.email}}<br>Phone: {{contact.phone}}</p>`,
      ),
    },
  },
];

export const TERMS_SECTIONS = [
  {
    type: 'RichText',
    data: {
      heading: L('წესები და პირობები', 'Terms and conditions'),
      body: L(
        `<p><em>ბოლო განახლება: ${LEGAL_UPDATED}</em></p>
<h2>1. ზოგადი დებულებები</h2>
<p>ვებგვერდს aspor.ge (შემდგომში „საიტი“) მართავს {{company.name}} (ს/კ {{company.code}}, მისამართი: {{company.address}}; შემდგომში „ASPOR“ ან „ჩვენ“). საიტით სარგებლობით ეთანხმებით ამ წესებს. თუ არ ეთანხმებით, გთხოვთ, არ გამოიყენოთ საიტი.</p>
<h2>2. საიტის დანიშნულება</h2>
<p>საიტი არის ASPOR-ის პროდუქციის (დამტენები, კაბელები, პაუერბანკები, ყურსასმენები, ქეისები) საინფორმაციო კატალოგი და B2B პარტნიორობის პლატფორმა. საიტზე პროდუქციის ონლაინ ყიდვა და გადახდა არ ხორციელდება. საბოლოო მომხმარებლები პროდუქციას იძენენ ASPOR-ის პარტნიორ მაღაზიებში (იხ. „სად ვიყიდო“).</p>
<h2>3. პარტნიორობის განაცხადი</h2>
<ul>
<li>განაცხადის გაგზავნა შეუძლია საქართველოში რეგისტრირებულ იურიდიულ პირს ან ინდივიდუალურ მეწარმეს.</li>
<li>განმცხადებელი ადასტურებს, რომ მითითებული მონაცემები ზუსტია და რომ უფლებამოსილია იმოქმედოს კომპანიის სახელით.</li>
<li>ASPOR განიხილავს განაცხადს და უფლებას იტოვებს, დაადასტუროს ან უარყოს იგი საკუთარი შეხედულებით. განხილვის შედეგს გაცნობებთ ელფოსტით.</li>
<li>განაცხადის დადასტურება თავისთავად არ წარმოშობს პროდუქციის მიწოდების ვალდებულებას. მიწოდების პირობები განისაზღვრება ცალკე შეთანხმებით.</li>
</ul>
<h2>4. პარტნიორის ანგარიში</h2>
<ul>
<li>დადასტურების შემდეგ ელფოსტაზე მიიღებთ ერთჯერად ბმულს პაროლის დასაყენებლად.</li>
<li>პარტნიორი ვალდებულია დაიცვას შესვლის მონაცემების კონფიდენციალურობა და არ გადასცეს ისინი მესამე პირს. ანგარიშიდან შესრულებულ მოქმედებებზე პასუხისმგებელია პარტნიორი.</li>
<li>ანგარიშზე არაავტორიზებული წვდომის ეჭვის შემთხვევაში დაუყოვნებლივ შეცვალეთ პაროლი და შეგვატყობინეთ.</li>
<li>კომპანიის მონაცემების ცვლილების შესახებ პარტნიორი ვალდებულია გვაცნობოს.</li>
<li>ASPOR უფლებას იტოვებს, შეაჩეროს ან გააუქმოს ანგარიში ამ წესების დარღვევის, არაზუსტი მონაცემების ან თანამშრომლობის შეწყვეტის შემთხვევაში.</li>
</ul>
<h2>5. საბითუმო ფასები</h2>
<ul>
<li>საბითუმო ფასები ხილულია მხოლოდ აქტიური პარტნიორისთვის, ანგარიშში შესვლის შემდეგ. ფასები მითითებულია ლარში, დღგ-ს ჩათვლით.</li>
<li>ფასები არის კონფიდენციალური კომერციული ინფორმაცია. პარტნიორი ვალდებულია არ გაასაჯაროოს და არ გადასცეს ისინი მესამე პირს.</li>
<li>საიტზე მითითებული ფასი საინფორმაციოა და არ წარმოადგენს საჯარო ოფერტას. ფასი შეიძლება შეიცვალოს წინასწარი შეტყობინების გარეშე. შეკვეთის საბოლოო ფასი და პირობები დასტურდება ინვოისით ან ცალკე შეთანხმებით.</li>
</ul>
<h2>6. პროდუქციის ინფორმაცია</h2>
<p>ვცდილობთ, პროდუქციის აღწერა, ტექნიკური მახასიათებლები და ფოტოები იყოს ზუსტი. ამის მიუხედავად, ფოტოზე ფერი ან დეტალები შეიძლება ოდნავ განსხვავდებოდეს, მწარმოებელმა შეიძლება შეცვალოს მახასიათებლები, ხოლო კატალოგში პროდუქტის არსებობა არ ნიშნავს მის მარაგში ყოფნას.</p>
<h2>7. მიწოდება, გარანტია და დაბრუნება</h2>
<p>პარტნიორებისთვის პროდუქციის მიწოდების, გადახდის, გარანტიისა და დაბრუნების პირობები განისაზღვრება ASPOR-სა და პარტნიორს შორის დადებული ცალკე შეთანხმებით. საბოლოო მომხმარებელი, რომელიც პროდუქციას იძენს პარტნიორ მაღაზიაში, თავის უფლებებს (მათ შორის კანონისმიერ გარანტიას) ახორციელებს გამყიდველთან, „მომხმარებლის უფლებების დაცვის შესახებ“ საქართველოს კანონის შესაბამისად.</p>
<h2>8. ინტელექტუალური საკუთრება</h2>
<p>სასაქონლო ნიშანი ASPOR, ლოგო, საიტის დიზაინი, ტექსტები, ფოტოები და სხვა მასალა დაცულია. აკრძალულია მათი კოპირება, გავრცელება ან კომერციული გამოყენება ASPOR-ის წინასწარი წერილობითი თანხმობის გარეშე. აქტიურ პარტნიორს შეუძლია გამოიყენოს კატალოგის ფოტოები და აღწერები მხოლოდ ASPOR-ის პროდუქციის რეკლამისა და გაყიდვისთვის; ASPOR-ს შეუძლია ეს ნებართვა ნებისმიერ დროს გამოიხმოს.</p>
<h2>9. აკრძალული ქმედებები</h2>
<ul>
<li>საიტის უსაფრთხოების სისტემების გვერდის ავლა ან მათი გამოცდა ნებართვის გარეშე;</li>
<li>მონაცემების ავტომატური მასობრივი შეგროვება (scraping), მათ შორის ფასების;</li>
<li>მავნე კოდის ან სპამის გავრცელება, ყალბი მონაცემებით განაცხადის გაგზავნა;</li>
<li>საიტის ისე გამოყენება, რაც არღვევს საქართველოს კანონმდებლობას ან მესამე პირის უფლებებს.</li>
</ul>
<h2>10. პასუხისმგებლობის შეზღუდვა</h2>
<p>საიტი მოწოდებულია „როგორც არის“. ვცდილობთ, უზრუნველვყოთ მისი უწყვეტი და უსაფრთხო მუშაობა, თუმცა ვერ გამოვრიცხავთ დროებით შეფერხებებს, ტექნიკურ სამუშაოებს ან შეცდომებს. კანონით დაშვებულ ფარგლებში ASPOR არ არის პასუხისმგებელი საიტის გამოყენებით ან მისი დროებითი მიუწვდომლობით გამოწვეულ არაპირდაპირ ზიანზე. საიტზე განთავსებული მესამე პირის ბმულების შინაარსზე პასუხს არ ვაგებთ.</p>
<h2>11. ფორს-მაჟორი</h2>
<p>მხარეები თავისუფლდებიან პასუხისმგებლობისგან ვალდებულების შეუსრულებლობისთვის, თუ ეს გამოწვეულია დაუძლეველი ძალით (სტიქიური უბედურება, ხანძარი, ომი, საგანგებო მდგომარეობა, სახელმწიფო ორგანოს გადაწყვეტილება და სხვა), რომელიც წარმოიშვა ვალდებულების აღების შემდეგ. ასეთ შემთხვევაში შესრულების ვადა გადაიწევს შესაბამისი პერიოდით, ხოლო დაზარალებული მხარე ვალდებულია, დაუყოვნებლივ აცნობოს მეორე მხარეს.</p>
<h2>12. პერსონალური მონაცემები</h2>
<p>პერსონალური მონაცემების დამუშავება რეგულირდება <a href="/ka/privacy">კონფიდენციალურობის პოლიტიკით</a> და <a href="/ka/cookies">Cookie პოლიტიკით</a>.</p>
<h2>13. ცვლილებები</h2>
<p>ASPOR უფლებას იტოვებს, შეცვალოს ეს წესები. ცვლილება ძალაში შედის საიტზე გამოქვეყნებისთანავე. არსებითი ცვლილებების შესახებ პარტნიორებს ელფოსტით შევატყობინებთ. ცვლილების შემდეგ საიტით სარგებლობა ნიშნავს განახლებულ წესებზე თანხმობას.</p>
<h2>14. მოქმედი კანონმდებლობა და დავები</h2>
<p>ეს წესები რეგულირდება საქართველოს კანონმდებლობით. დავები წყდება მოლაპარაკებით, ხოლო შეთანხმების მიუღწევლობის შემთხვევაში — საქართველოს საერთო სასამართლოების მიერ.</p>
<h2>15. კონტაქტი</h2>
<p>ელფოსტა: {{contact.email}}<br>ტელეფონი: {{contact.phone}}<br>მისამართი: {{company.address}}</p>`,
        `<p><em>Last updated: ${LEGAL_UPDATED}</em></p>
<h2>1. General</h2>
<p>The website aspor.ge (the “Site”) is operated by {{company.name}} (identification code {{company.code}}, address: {{company.address}}; “ASPOR”, “we”). By using the Site you accept these terms. If you do not agree, please do not use the Site.</p>
<h2>2. Purpose of the Site</h2>
<p>The Site is an information catalogue of ASPOR products (chargers, cables, power banks, headphones, phone cases) and a B2B partnership platform. No products are sold or paid for online on the Site. End customers buy ASPOR products from partner stores (see “Where to buy”).</p>
<h2>3. Partnership applications</h2>
<ul>
<li>Applications may be submitted by legal entities or individual entrepreneurs registered in Georgia.</li>
<li>The applicant confirms that the information provided is accurate and that they are authorised to act on behalf of the company.</li>
<li>ASPOR reviews applications and may approve or reject them at its discretion. You will be informed of the outcome by email.</li>
<li>Approval alone does not create an obligation to supply products. Supply terms are set out in a separate agreement.</li>
</ul>
<h2>4. Partner accounts</h2>
<ul>
<li>After approval you receive a one-time link by email to set your password.</li>
<li>Partners must keep their sign-in details confidential and must not share them. The partner is responsible for actions taken from its account.</li>
<li>If you suspect unauthorised access, change your password immediately and let us know.</li>
<li>Partners must inform us of changes to their company details.</li>
<li>ASPOR may suspend or close an account for breach of these terms, inaccurate information or termination of cooperation.</li>
</ul>
<h2>5. Wholesale prices</h2>
<ul>
<li>Wholesale prices are visible only to active partners after signing in. Prices are in GEL and include VAT.</li>
<li>Prices are confidential commercial information. Partners must not publish them or pass them to third parties.</li>
<li>Prices on the Site are for information and are not a public offer. They may change without notice. The final price and terms of an order are confirmed by invoice or a separate agreement.</li>
</ul>
<h2>6. Product information</h2>
<p>We aim to keep descriptions, specifications and photos accurate. However, colours or details in photos may differ slightly, the manufacturer may change specifications, and a product listed in the catalogue is not necessarily in stock.</p>
<h2>7. Delivery, warranty and returns</h2>
<p>Terms for supply, payment, warranty and returns for partners are set out in a separate agreement between ASPOR and the partner. End customers who buy from a partner store exercise their rights (including the statutory warranty) against the seller under the Law of Georgia on Consumer Rights Protection.</p>
<h2>8. Intellectual property</h2>
<p>The ASPOR trademark, logo, site design, texts, photos and other materials are protected. They may not be copied, distributed or used commercially without ASPOR’s prior written consent. Active partners may use catalogue photos and descriptions solely to advertise and sell ASPOR products; ASPOR may withdraw this permission at any time.</p>
<h2>9. Prohibited conduct</h2>
<ul>
<li>bypassing or testing the Site’s security without permission;</li>
<li>automated bulk collection of data (scraping), including prices;</li>
<li>distributing malicious code or spam, or submitting applications with false information;</li>
<li>using the Site in breach of Georgian law or the rights of third parties.</li>
</ul>
<h2>10. Limitation of liability</h2>
<p>The Site is provided “as is”. We aim to keep it available and secure but cannot rule out temporary interruptions, maintenance or errors. To the extent permitted by law, ASPOR is not liable for indirect loss arising from use of the Site or its temporary unavailability. We are not responsible for the content of third-party links.</p>
<h2>11. Force majeure</h2>
<p>Neither party is liable for failure to perform caused by force majeure (natural disaster, fire, war, state of emergency, decisions of public authorities, etc.) arising after the obligation was undertaken. Deadlines are extended accordingly, and the affected party must notify the other without delay.</p>
<h2>12. Personal data</h2>
<p>Processing of personal data is governed by the <a href="/en/privacy">Privacy policy</a> and the <a href="/en/cookies">Cookie policy</a>.</p>
<h2>13. Changes</h2>
<p>ASPOR may change these terms. Changes take effect when published on the Site. Partners will be notified of material changes by email. Continued use of the Site after a change means acceptance of the updated terms.</p>
<h2>14. Governing law and disputes</h2>
<p>These terms are governed by the laws of Georgia. Disputes are resolved by negotiation and, failing agreement, by the common courts of Georgia.</p>
<h2>15. Contact</h2>
<p>Email: {{contact.email}}<br>Phone: {{contact.phone}}<br>Address: {{company.address}}</p>`,
      ),
    },
  },
];

export const COOKIE_SECTIONS = [
  {
    type: 'RichText',
    data: {
      heading: L('Cookie პოლიტიკა', 'Cookie policy'),
      body: L(
        `<p><em>ბოლო განახლება: ${LEGAL_UPDATED}</em></p>
<p>Cookie არის მცირე ტექსტური ფაილი, რომელსაც საიტი ინახავს თქვენს ბრაუზერში. aspor.ge იყენებს მხოლოდ საიტის მუშაობისთვის აუცილებელ cookie-ებს, ხოლო ანალიტიკურ და მარკეტინგულ cookie-ებს — მხოლოდ თქვენი თანხმობით.</p>
<h2>1. აუცილებელი</h2>
<p>ამ cookie-ების გარეშე საიტი (მაგ. პარტნიორის ანგარიშში შესვლა) ვერ იმუშავებს, ამიტომ თანხმობას არ საჭიროებს.</p>
<table><tr><th>Cookie</th><th>მიზანი</th><th>ვადა</th></tr><tr><td>aspor_sid</td><td>პარტნიორის სესია (შესვლის შენარჩუნება)</td><td>30 დღე ან გამოსვლამდე</td></tr><tr><td>aspor_admin_sid</td><td>ადმინისტრატორის სესია</td><td>12 სთ ან გამოსვლამდე</td></tr><tr><td>aspor_consent</td><td>თქვენი cookie არჩევანის დამახსოვრება</td><td>180 დღე</td></tr><tr><td>NEXT_LOCALE</td><td>ენის არჩევანი</td><td>სესია</td></tr></table>
<h2>2. ანალიტიკური და მარკეტინგული (მხოლოდ თანხმობით)</h2>
<table><tr><th>Cookie</th><th>მიმწოდებელი</th><th>მიზანი</th></tr><tr><td>_ga, _ga_*</td><td>Google Analytics 4</td><td>საიტის გამოყენების ანონიმური სტატისტიკა</td></tr><tr><td>_fbp</td><td>Meta Pixel</td><td>რეკლამის ეფექტიანობის გაზომვა</td></tr></table>
<p>ეს cookie-ები ჩაიტვირთება მხოლოდ მას შემდეგ, რაც ბანერზე აირჩევთ „ყველას დაშვებას“. „მხოლოდ აუცილებელი“ არჩევის შემთხვევაში ისინი არ გამოიყენება. მათი ვადა განისაზღვრება მიმწოდებლის მიერ.</p>
<h2>3. არჩევანის შეცვლა</h2>
<p>არჩევანის შეცვლა ნებისმიერ დროს შეგიძლიათ საიტის ქვედა ნაწილში ბმულით „Cookie პარამეტრები“. cookie-ების წაშლა ან დაბლოკვა ასევე შესაძლებელია ბრაუზერის პარამეტრებიდან; აუცილებელი cookie-ების დაბლოკვის შემთხვევაში ანგარიშში შესვლა ვერ იმუშავებს.</p>
<p>დამატებითი ინფორმაცია: <a href="/ka/privacy">კონფიდენციალურობის პოლიტიკა</a>. კითხვებისთვის: {{contact.email}}.</p>`,
        `<p><em>Last updated: ${LEGAL_UPDATED}</em></p>
<p>A cookie is a small text file a website stores in your browser. aspor.ge uses only the cookies needed to run the Site, and analytics and marketing cookies only with your consent.</p>
<h2>1. Essential</h2>
<p>The Site (for example, partner sign-in) cannot work without these cookies, so they do not require consent.</p>
<table><tr><th>Cookie</th><th>Purpose</th><th>Duration</th></tr><tr><td>aspor_sid</td><td>Partner session (keeps you signed in)</td><td>30 days or until sign-out</td></tr><tr><td>aspor_admin_sid</td><td>Administrator session</td><td>12 h or until sign-out</td></tr><tr><td>aspor_consent</td><td>Remembers your cookie choice</td><td>180 days</td></tr><tr><td>NEXT_LOCALE</td><td>Language choice</td><td>Session</td></tr></table>
<h2>2. Analytics and marketing (consent only)</h2>
<table><tr><th>Cookie</th><th>Provider</th><th>Purpose</th></tr><tr><td>_ga, _ga_*</td><td>Google Analytics 4</td><td>Anonymous usage statistics</td></tr><tr><td>_fbp</td><td>Meta Pixel</td><td>Measuring advertising effectiveness</td></tr></table>
<p>These cookies load only after you choose “Accept all” on the banner. If you choose “Essential only”, they are not used. Their duration is set by the provider.</p>
<h2>3. Changing your choice</h2>
<p>You can change your choice at any time via “Cookie settings” at the bottom of the Site. You can also delete or block cookies in your browser settings; if you block essential cookies, sign-in will not work.</p>
<p>More information: <a href="/en/privacy">Privacy policy</a>. Questions: {{contact.email}}.</p>`,
      ),
    },
  },
];

export const LEGAL_PAGES = [
  { key: 'privacy', slug: 'privacy', titleKa: 'კონფიდენციალურობის პოლიტიკა', titleEn: 'Privacy policy', sections: PRIVACY_SECTIONS, seoKa: 'როგორ ამუშავებს ASPOR პერსონალურ მონაცემებს: რას ვაგროვებთ, რა მიზნით, ვის ვუზიარებთ და რა უფლებები გაქვთ.', seoEn: 'How ASPOR processes personal data: what we collect, why, who we share it with and your rights.' },
  { key: 'terms', slug: 'terms', titleKa: 'წესები და პირობები', titleEn: 'Terms and conditions', sections: TERMS_SECTIONS, seoKa: 'aspor.ge-ით სარგებლობის, პარტნიორის ანგარიშისა და საბითუმო ფასების წესები და პირობები.', seoEn: 'Terms for using aspor.ge, partner accounts and wholesale prices.' },
  { key: 'cookies', slug: 'cookies', titleKa: 'Cookie პოლიტიკა', titleEn: 'Cookie policy', sections: COOKIE_SECTIONS, seoKa: 'რომელ cookie-ებს იყენებს aspor.ge და როგორ შეცვალოთ არჩევანი.', seoEn: 'Which cookies aspor.ge uses and how to change your choice.' },
] as const;
