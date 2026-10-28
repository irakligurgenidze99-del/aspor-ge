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
 * render time from Admin → პარამეტრები (src/lib/legal-tokens.ts). Text inside
 * [[ … ]] is shown only when every placeholder in it has a value.
 */
import { LEGAL_UPDATED } from '../src/lib/legal-version';
export { LEGAL_UPDATED };

const L = (ka: string, en: string) => ({ ka, en });

const CONTROLLER_KA = `<p><strong>{{company.name}}</strong>[[, საიდენტიფიკაციო კოდი: {{company.code}}]][[, მისამართი: {{company.address}}]].<br>[[ელფოსტა: {{contact.email}}<br>]][[ტელეფონი: {{contact.phone}}<br>]]კონტაქტი: <a href="/ka/contact">საკონტაქტო ფორმა</a>.</p>`;
const CONTROLLER_EN = `<p><strong>{{company.name}}</strong>[[, identification code: {{company.code}}]][[, address: {{company.address}}]].<br>[[Email: {{contact.email}}<br>]][[Phone: {{contact.phone}}<br>]]Contact: <a href="/en/contact">contact form</a>.</p>`;

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
<li><strong>ონლაინ შეკვეთა:</strong> სახელი და გვარი, ტელეფონი, ელფოსტა, მიწოდების ქალაქი და მისამართი, კომენტარი, შეკვეთის შინაარსი და თანხა, გადახდის მეთოდი და სტატუსი (მაგ. „გადახდილი“), განვადების ვადა. პარტნიორის შეკვეთაზე — კომპანიის დასახელება და საიდენტიფიკაციო კოდი.</li>
<li><strong>საკონტაქტო ფორმა:</strong> სახელი, ელფოსტა, ტელეფონი (არასავალდებულო), თემა და შეტყობინების ტექსტი.</li>
<li><strong>ტექნიკური მონაცემები:</strong> ანგარიშში შესვლისას — IP მისამართი, ბრაუზერის ტიპი და სესიის დრო; ფორმების გაგზავნისას — IP მისამართის ჰეში (შეუქცევადად გარდაქმნილი), რომელიც გამოიყენება მხოლოდ უსაფრთხოებისა და სპამისგან დაცვისთვის.</li>
<li><strong>Cookie-ები:</strong> იხ. <a href="/ka/cookies">Cookie პოლიტიკა</a>.</li>
</ul>
<p>საბანკო ბარათის მონაცემები შეიყვანება მხოლოდ Bank of Georgia-ს გადახდის გვერდზე — ASPOR მათ ვერ ხედავს და არ ინახავს.</p>
<h2>3. დამუშავების მიზნები და სამართლებრივი საფუძველი</h2>
<ul>
<li>შეკვეთის მიღება, გადახდის დადასტურება, მიწოდება, დაბრუნება და საგარანტიო მომსახურება — ხელშეკრულების დადებისა და შესრულებისთვის აუცილებელი დამუშავება;</li>
<li>საგადასახადო და ბუღალტრული აღრიცხვის ვალდებულებების შესრულება — კანონით დაკისრებული მოვალეობა;</li>
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
<li>Resend — სისტემური ელფოსტების გაგზავნა (შეკვეთის დადასტურება, ანგარიშის აქტივაცია, პაროლის აღდგენა, განაცხადის სტატუსი);</li>
<li>სს „საქართველოს ბანკი“ — გადახდის დამუშავება და განვადება. ბანკს გადაეცემა შეკვეთის ნომერი, თანხა, პროდუქციის ჩამონათვალი და მყიდველის სახელი, ტელეფონი და ელფოსტა. ბარათის მონაცემებს და განვადების განაცხადს ბანკი ამუშავებს საკუთარი წესებით, როგორც დამოუკიდებელი პასუხისმგებელი პირი;</li>
<li>მიწოდების მომსახურების მიმწოდებელი — მხოლოდ მიწოდებისთვის საჭირო მონაცემები (სახელი, ტელეფონი, მისამართი);</li>
<li>Google (Google Analytics) და Meta Platforms (Meta Pixel) — მხოლოდ თქვენი თანხმობის შემთხვევაში.</li>
</ul>
<p>ზოგიერთი მიმწოდებელი რეგისტრირებულია ან მონაცემებს ამუშავებს საქართველოს ფარგლებს გარეთ (მათ შორის აშშ-ში). ასეთ შემთხვევაში მონაცემთა გადაცემა ხორციელდება კანონით დადგენილი გარანტიების დაცვით. მონაცემები შეიძლება გადაეცეს სახელმწიფო ორგანოს მხოლოდ კანონით გათვალისწინებულ შემთხვევაში.</p>
<h2>5. შენახვის ვადა</h2>
<ul>
<li>შეკვეთის მონაცემები ინახება საგადასახადო და ბუღალტრული აღრიცხვის კანონმდებლობით დადგენილი ვადით და იმ ვადით, რაც საჭიროა დაბრუნებისა და გარანტიის უფლებების განსახორციელებლად. დაუსრულებელი (გადაუხდელი) შეკვეთები ავტომატურად უქმდება;</li>
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
<p>მოთხოვნის გასაგზავნად მოგვწერეთ[[ ელფოსტაზე {{contact.email}} ან]] <a href="/ka/contact">საკონტაქტო ფორმით</a>. მოთხოვნას ვუპასუხებთ კანონით დადგენილ ვადაში (არაუგვიანეს 10 სამუშაო დღისა). შესაძლოა გთხოვოთ ვინაობის დადასტურება.</p>
<h2>8. ცვლილებები</h2>
<p>პოლიტიკა შეიძლება განახლდეს. მოქმედი ვერსია ყოველთვის ამ გვერდზეა გამოქვეყნებული და მითითებულია ბოლო განახლების თარიღი. არსებითი ცვლილებების შესახებ პარტნიორებს ელფოსტით შევატყობინებთ.</p>
<h2>9. კონტაქტი</h2>
<p>[[ელფოსტა: {{contact.email}}<br>]][[ტელეფონი: {{contact.phone}}<br>]]საკონტაქტო ფორმა: <a href="/ka/contact">aspor.ge/ka/contact</a></p>`,
        `<p><em>Last updated: ${LEGAL_UPDATED}</em></p>
<p>This policy explains how the ASPOR website (aspor.ge, the “Site”) collects, uses and protects personal data. Data is processed in accordance with the Law of Georgia on Personal Data Protection.</p>
<h2>1. Data controller</h2>
${CONTROLLER_EN}
<h2>2. What we collect</h2>
<ul>
<li><strong>Partner application:</strong> company name, identification code, contact person’s name, phone, email and any additional information you provide.</li>
<li><strong>Partner account:</strong> the data above, company address (if provided), email and password (stored only as a one-way hash — we cannot see your password).</li>
<li><strong>Online orders:</strong> full name, phone, email, delivery city and address, comment, order contents and amount, payment method and status (e.g. “paid”), installment term. For partner orders — company name and identification code.</li>
<li><strong>Contact form:</strong> name, email, phone (optional), subject and message.</li>
<li><strong>Technical data:</strong> when you sign in — IP address, browser type and session time; when you submit a form — an irreversible hash of your IP address, used only for security and spam prevention.</li>
<li><strong>Cookies:</strong> see the <a href="/en/cookies">Cookie policy</a>.</li>
</ul>
<p>Payment card details are entered only on Bank of Georgia’s payment page — ASPOR cannot see or store them.</p>
<h2>3. Purposes and legal basis</h2>
<ul>
<li>Accepting orders, confirming payment, delivery, returns and warranty service — processing necessary to enter into and perform a contract;</li>
<li>Tax and accounting obligations — legal obligation;</li>
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
<li>Resend — system emails (order confirmation, account activation, password reset, application status);</li>
<li>JSC Bank of Georgia — payment processing and installments. The bank receives the order number, amount, item list and the buyer’s name, phone and email. The bank processes card details and installment applications under its own rules, as an independent controller;</li>
<li>Delivery service provider — only the data needed for delivery (name, phone, address);</li>
<li>Google (Google Analytics) and Meta Platforms (Meta Pixel) — only with your consent.</li>
</ul>
<p>Some providers are established or process data outside Georgia (including the USA). Such transfers are made with the safeguards required by law. Data may be disclosed to public authorities only where the law requires it.</p>
<h2>5. Retention</h2>
<ul>
<li>Order data is kept for the period required by tax and accounting law and as long as needed to exercise return and warranty rights. Unfinished (unpaid) orders are cancelled automatically;</li>
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
<p>To make a request, write to us[[ at {{contact.email}} or]] via the <a href="/en/contact">contact form</a>. We will reply within the period set by law (no later than 10 working days). We may ask you to confirm your identity.</p>
<h2>8. Changes</h2>
<p>This policy may be updated. The current version is always published on this page with its last-updated date. Partners will be notified of material changes by email.</p>
<h2>9. Contact</h2>
<p>[[Email: {{contact.email}}<br>]][[Phone: {{contact.phone}}<br>]]Contact form: <a href="/en/contact">aspor.ge/en/contact</a></p>`,
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
<p>ვებგვერდს aspor.ge (შემდგომში „საიტი“) მართავს და პროდუქციას ყიდის {{company.name}} ([[ს/კ {{company.code}}; ]][[მისამართი: {{company.address}}; ]]შემდგომში „ASPOR“, „გამყიდველი“ ან „ჩვენ“). საიტით სარგებლობით და შეკვეთის გაფორმებით ეთანხმებით ამ წესებს. თუ არ ეთანხმებით, გთხოვთ, არ გამოიყენოთ საიტი.</p>
<h2>2. საიტის დანიშნულება</h2>
<p>საიტი არის ASPOR-ის პროდუქციის (დამტენები, კაბელები, პაუერბანკები, ყურსასმენები, ქეისები) კატალოგი და ონლაინ მაღაზია. საცალო ფასით ყიდვა შეუძლია ნებისმიერ მომხმარებელს, ხოლო დამტკიცებულ B2B პარტნიორებს — საბითუმო ფასით. ASPOR-ის პროდუქცია ასევე იყიდება პარტნიორ მაღაზიებში (იხ. „სად ვიყიდო“).</p>
<h2>3. შეკვეთა და ხელშეკრულების დადება</h2>
<ul>
<li>ონლაინ შეძენა შესაძლებელია იმ პროდუქტზე, რომელსაც საიტზე მითითებული აქვს ფასი და ღილაკი „ყიდვა“.</li>
<li>ფასები მითითებულია ლარში, დღგ-ს ჩათვლით. შეკვეთის თანხას ყოველთვის ითვლის სისტემა შეკვეთის მომენტში მოქმედი ფასით.</li>
<li>შეკვეთის გაფორმებისას მიუთითეთ ზუსტი სახელი, ტელეფონი, ელფოსტა და მიწოდების მისამართი. არასწორი მონაცემებით გამოწვეულ შეფერხებაზე პასუხს ვერ ვაგებთ.</li>
<li>ხელშეკრულება დადებულად ითვლება გადახდის (ან განვადების) წარმატებით დადასტურებისას. დადასტურებას მიიღებთ ეკრანზე და ელფოსტით, შეკვეთის ნომრით.</li>
<li>თუ პროდუქტი აღარ არის მარაგში ან ფასი აშკარა ტექნიკური შეცდომით იყო მითითებული, ASPOR დაგიკავშირდებათ და, თქვენი სურვილით, გააუქმებს შეკვეთას და სრულად დაგიბრუნებთ გადახდილ თანხას.</li>
</ul>
<h2>4. გადახდა</h2>
<ul>
<li><strong>ბარათით:</strong> გადახდა ხორციელდება სს „საქართველოს ბანკის“ (Bank of Georgia) უსაფრთხო გადახდის გვერდზე. ბარათის მონაცემები ASPOR-ს არ გადმოეცემა და არ ინახება.</li>
<li><strong>BOG განვადება:</strong> განვადებას გასცემს და მის პირობებს (ვადა, თვიური შენატანი, საპროცენტო განაკვეთი) ადგენს სს „საქართველოს ბანკი“. სესხის ხელშეკრულება იდება თქვენსა და ბანკს შორის; განაცხადის დამტკიცებაზე გადაწყვეტილებას იღებს ბანკი. ASPOR ამ ხელშეკრულების მხარე არ არის.</li>
<li>თუ გადახდა ან განვადება არ დადასტურდა, შეკვეთა არ სრულდება და თანხა არ ჩამოგეჭრებათ.</li>
</ul>
<h2>5. მიწოდება</h2>
<ul>
<li>მიწოდება <strong>უფასოა მთელ საქართველოში</strong>.</li>
<li>მიწოდების დეტალებს დაგიზუსტებთ ტელეფონით ან ელფოსტით. პროდუქცია მოგეწოდებათ გონივრულ ვადაში, არაუგვიანეს 30 კალენდარული დღისა შეკვეთის დადასტურებიდან, თუ სხვა ვადა არ შევთანხმდით.</li>
<li>თუ მიწოდება შეუძლებელი აღმოჩნდა, შეკვეთა უქმდება და გადახდილი თანხა სრულად გიბრუნდებათ.</li>
<li>პროდუქციის ჩაბარებისას შეამოწმეთ შეფუთვა და ნივთი. ხილული დაზიანების შემთხვევაში აცნობეთ კურიერს და დაგვიკავშირდით.</li>
</ul>
<h2>6. ხელშეკრულებაზე უარის თქმა (14 დღე)</h2>
<ul>
<li>მომხმარებელს (ფიზიკურ პირს, რომელიც ყიდულობს პირადი მოხმარებისთვის) უფლება აქვს, მიზეზის მითითების გარეშე უარი თქვას ხელშეკრულებაზე <strong>14 კალენდარული დღის</strong> განმავლობაში, პროდუქციის მიღებიდან.</li>
<li>უარის შესახებ შეგვატყობინეთ [[ელფოსტით ({{contact.email}}), ]][[ტელეფონით ({{contact.phone}}) ]]ან <a href="/ka/contact">საკონტაქტო ფორმით</a>, შეკვეთის ნომრის მითითებით.</li>
<li>პროდუქცია დაგვიბრუნეთ შეტყობინებიდან 14 დღის განმავლობაში, სრული კომპლექტაციით. დაბრუნების პირდაპირ ხარჯს ფარავს მომხმარებელი, გარდა იმ შემთხვევისა, როცა ნივთი ნაკლიანია ან არასწორი ნივთი მოგეწოდათ.</li>
<li>თანხას დაგიბრუნებთ შეტყობინების მიღებიდან 14 დღის განმავლობაში, იმავე საშუალებით, რომლითაც გადაიხადეთ (განვადების შემთხვევაში — ბანკთან შეთანხმებული წესით). თანხის დაბრუნება შეიძლება შეჩერდეს პროდუქციის დაბრუნებამდე.</li>
<li>მომხმარებელი პასუხისმგებელია პროდუქციის ღირებულების შემცირებაზე, რომელიც გამოწვეულია ნივთის ისეთი გამოყენებით, რაც არ იყო საჭირო მისი ბუნების, მახასიათებლებისა და ფუნქციონირების შესამოწმებლად.</li>
<li>ეს უფლება არ ვრცელდება B2B პარტნიორის მიერ სამეწარმეო მიზნით შეძენილ პროდუქციაზე. ასეთ შეძენას არეგულირებს ASPOR-სა და პარტნიორს შორის შეთანხმება.</li>
</ul>
<h2>7. ნაკლიანი პროდუქცია და კანონისმიერი გარანტია</h2>
<ul>
<li>ASPOR ვალდებულია მოგაწოდოთ აღწერილობის შესაბამისი, უნაკლო პროდუქცია.</li>
<li>თუ ნაკლი გამოვლინდა მიწოდებიდან 2 წლის განმავლობაში, უფლება გაქვთ, მოითხოვოთ ნივთის უსასყიდლოდ შეკეთება ან შეცვლა, ხოლო თუ ეს შეუძლებელია — ფასის შემცირება ან ხელშეკრულებაზე უარი (უმნიშვნელო ნაკლის გარდა).</li>
<li>მიწოდებიდან 6 თვის განმავლობაში გამოვლენილი ნაკლი ივარაუდება, რომ არსებობდა მიწოდების მომენტში, თუ ეს არ ეწინააღმდეგება ნივთის ან ნაკლის ბუნებას.</li>
<li>გარანტია არ ვრცელდება დაზიანებაზე, რომელიც გამოწვეულია დავარდნით, სითხით, არასწორი გამოყენებით, არაავტორიზებული შეკეთებით ან ბუნებრივი ცვეთით.</li>
<li>ნაკლის შესახებ დაგვიკავშირდით[[ ({{contact.email}})]][[ ({{contact.phone}})]] ან <a href="/ka/contact">საკონტაქტო ფორმით</a> და მიუთითეთ შეკვეთის ნომერი.</li>
</ul>
<h2>8. B2B პარტნიორობა და ანგარიში</h2>
<ul>
<li>პარტნიორობის განაცხადის გაგზავნა შეუძლია საქართველოში რეგისტრირებულ იურიდიულ პირს ან ინდივიდუალურ მეწარმეს. განმცხადებელი ადასტურებს, რომ მონაცემები ზუსტია და უფლებამოსილია იმოქმედოს კომპანიის სახელით.</li>
<li>ASPOR განიხილავს განაცხადს და უფლებას იტოვებს, დაადასტუროს ან უარყოს იგი საკუთარი შეხედულებით.</li>
<li>დადასტურების შემდეგ ელფოსტაზე მიიღებთ ერთჯერად ბმულს პაროლის დასაყენებლად. პარტნიორი ვალდებულია დაიცვას შესვლის მონაცემების კონფიდენციალურობა და პასუხისმგებელია ანგარიშიდან შესრულებულ მოქმედებებზე.</li>
<li>ASPOR უფლებას იტოვებს, შეაჩეროს ან გააუქმოს ანგარიში წესების დარღვევის, არაზუსტი მონაცემების ან თანამშრომლობის შეწყვეტის შემთხვევაში.</li>
</ul>
<h2>9. საბითუმო ფასები</h2>
<ul>
<li>საბითუმო ფასები ხილულია მხოლოდ აქტიური პარტნიორისთვის, ანგარიშში შესვლის შემდეგ, და გამოიყენება პარტნიორის ონლაინ შეკვეთაზე.</li>
<li>საბითუმო ფასები კონფიდენციალური კომერციული ინფორმაციაა. პარტნიორი ვალდებულია არ გაასაჯაროოს და არ გადასცეს ისინი მესამე პირს.</li>
<li>ფასები შეიძლება შეიცვალოს წინასწარი შეტყობინების გარეშე; უკვე გადახდილ შეკვეთაზე ცვლილება არ ვრცელდება.</li>
</ul>
<h2>10. პროდუქციის ინფორმაცია</h2>
<p>ვცდილობთ, პროდუქციის აღწერა, ტექნიკური მახასიათებლები და ფოტოები იყოს ზუსტი. ფოტოზე ფერი ან დეტალები შეიძლება ოდნავ განსხვავდებოდეს, ხოლო მწარმოებელმა შეიძლება შეცვალოს მახასიათებლები.</p>
<h2>11. ინტელექტუალური საკუთრება</h2>
<p>სასაქონლო ნიშანი ASPOR, ლოგო, საიტის დიზაინი, ტექსტები, ფოტოები და სხვა მასალა დაცულია. აკრძალულია მათი კოპირება, გავრცელება ან კომერციული გამოყენება ASPOR-ის წინასწარი წერილობითი თანხმობის გარეშე. აქტიურ პარტნიორს შეუძლია გამოიყენოს კატალოგის ფოტოები და აღწერები მხოლოდ ASPOR-ის პროდუქციის რეკლამისა და გაყიდვისთვის; ASPOR-ს შეუძლია ეს ნებართვა ნებისმიერ დროს გამოიხმოს.</p>
<h2>12. აკრძალული ქმედებები</h2>
<ul>
<li>საიტის უსაფრთხოების სისტემების გვერდის ავლა ან მათი გამოცდა ნებართვის გარეშე;</li>
<li>მონაცემების ავტომატური მასობრივი შეგროვება (scraping), მათ შორის ფასების;</li>
<li>მავნე კოდის ან სპამის გავრცელება, ყალბი მონაცემებით შეკვეთის ან განაცხადის გაგზავნა;</li>
<li>საიტის ისე გამოყენება, რაც არღვევს საქართველოს კანონმდებლობას ან მესამე პირის უფლებებს.</li>
</ul>
<h2>13. პასუხისმგებლობის შეზღუდვა</h2>
<p>ვცდილობთ, უზრუნველვყოთ საიტის უწყვეტი და უსაფრთხო მუშაობა, თუმცა ვერ გამოვრიცხავთ დროებით შეფერხებებს, ტექნიკურ სამუშაოებს ან შეცდომებს. კანონით დაშვებულ ფარგლებში ASPOR არ არის პასუხისმგებელი საიტის დროებითი მიუწვდომლობით გამოწვეულ არაპირდაპირ ზიანზე. ეს არ ზღუდავს მომხმარებლის კანონით გარანტირებულ უფლებებს.</p>
<h2>14. ფორს-მაჟორი</h2>
<p>მხარეები თავისუფლდებიან პასუხისმგებლობისგან ვალდებულების შეუსრულებლობისთვის, თუ ეს გამოწვეულია დაუძლეველი ძალით (სტიქიური უბედურება, ხანძარი, ომი, საგანგებო მდგომარეობა, სახელმწიფო ორგანოს გადაწყვეტილება და სხვა), რომელიც წარმოიშვა შეკვეთის შემდეგ. ასეთ შემთხვევაში შესრულების ვადა გადაიწევს შესაბამისი პერიოდით, ხოლო დაზარალებული მხარე ვალდებულია, დაუყოვნებლივ აცნობოს მეორე მხარეს.</p>
<h2>15. პერსონალური მონაცემები</h2>
<p>პერსონალური მონაცემების დამუშავება რეგულირდება <a href="/ka/privacy">კონფიდენციალურობის პოლიტიკით</a> და <a href="/ka/cookies">Cookie პოლიტიკით</a>.</p>
<h2>16. ცვლილებები</h2>
<p>ASPOR უფლებას იტოვებს, შეცვალოს ეს წესები. ცვლილება ძალაში შედის საიტზე გამოქვეყნებისთანავე და არ ვრცელდება უკვე დადასტურებულ შეკვეთებზე — მათზე მოქმედებს შეკვეთის დროს მოქმედი ვერსია.</p>
<h2>17. მოქმედი კანონმდებლობა და დავები</h2>
<p>ეს წესები რეგულირდება საქართველოს კანონმდებლობით, მათ შორის „მომხმარებლის უფლებების დაცვის შესახებ“ საქართველოს კანონით. დავები წყდება მოლაპარაკებით, ხოლო შეთანხმების მიუღწევლობის შემთხვევაში — საქართველოს საერთო სასამართლოების მიერ.</p>
<h2>18. კონტაქტი</h2>
<p>[[ელფოსტა: {{contact.email}}<br>]][[ტელეფონი: {{contact.phone}}<br>]][[მისამართი: {{company.address}}<br>]]საკონტაქტო ფორმა: <a href="/ka/contact">aspor.ge/ka/contact</a></p>`,
        `<p><em>Last updated: ${LEGAL_UPDATED}</em></p>
<h2>1. General</h2>
<p>The website aspor.ge (the “Site”) is operated, and products are sold, by {{company.name}} ([[identification code {{company.code}}; ]][[address: {{company.address}}; ]]“ASPOR”, the “Seller”, “we”). By using the Site and placing an order you accept these terms. If you do not agree, please do not use the Site.</p>
<h2>2. Purpose of the Site</h2>
<p>The Site is a catalogue and online store for ASPOR products (chargers, cables, power banks, headphones, phone cases). Anyone can buy at the retail price; approved B2B partners buy at the wholesale price. ASPOR products are also sold in partner stores (see “Where to buy”).</p>
<h2>3. Orders and conclusion of the contract</h2>
<ul>
<li>Products that show a price and a “Buy” button can be bought online.</li>
<li>Prices are in GEL and include VAT. The order amount is always calculated by the system at the price in force when the order is placed.</li>
<li>Provide an accurate name, phone, email and delivery address. We are not responsible for delays caused by incorrect details.</li>
<li>The contract is concluded when the payment (or installment) is successfully confirmed. You receive confirmation on screen and by email, with an order number.</li>
<li>If a product is out of stock or its price was shown through an obvious technical error, ASPOR will contact you and, at your choice, cancel the order and refund the full amount.</li>
</ul>
<h2>4. Payment</h2>
<ul>
<li><strong>By card:</strong> payment is made on the secure payment page of JSC Bank of Georgia. Card details are never passed to or stored by ASPOR.</li>
<li><strong>BOG installments:</strong> installment loans are granted by JSC Bank of Georgia, which sets their terms (term, monthly payment, interest). The loan contract is between you and the bank, and the bank decides on approval. ASPOR is not a party to that contract.</li>
<li>If the payment or installment is not confirmed, the order is not fulfilled and you are not charged.</li>
</ul>
<h2>5. Delivery</h2>
<ul>
<li>Delivery is <strong>free throughout Georgia</strong>.</li>
<li>We will confirm delivery details by phone or email. Products are delivered within a reasonable time and no later than 30 calendar days after the order is confirmed, unless agreed otherwise.</li>
<li>If delivery proves impossible, the order is cancelled and the full amount refunded.</li>
<li>Check the packaging and the product on delivery. If there is visible damage, tell the courier and contact us.</li>
</ul>
<h2>6. Right of withdrawal (14 days)</h2>
<ul>
<li>A consumer (an individual buying for personal use) may withdraw from the contract without giving a reason within <strong>14 calendar days</strong> of receiving the products.</li>
<li>Notify us [[by email ({{contact.email}}), ]][[by phone ({{contact.phone}}) ]]or via the <a href="/en/contact">contact form</a>, quoting the order number.</li>
<li>Return the products within 14 days of your notice, complete with all accessories. The consumer bears the direct cost of return, unless the product is defective or the wrong product was delivered.</li>
<li>We refund you within 14 days of receiving your notice, using the same payment method (for installments, as arranged with the bank). The refund may be withheld until the products have been returned.</li>
<li>The consumer is liable for any loss in value caused by handling the product beyond what is needed to establish its nature, characteristics and functioning.</li>
<li>This right does not apply to purchases made by a B2B partner for business purposes; those are governed by the agreement between ASPOR and the partner.</li>
</ul>
<h2>7. Defective products and statutory warranty</h2>
<ul>
<li>ASPOR must deliver products that match their description and are free of defects.</li>
<li>If a defect appears within 2 years of delivery, you may ask for free repair or replacement and, if that is impossible, a price reduction or withdrawal from the contract (except for minor defects).</li>
<li>A defect that appears within 6 months of delivery is presumed to have existed at delivery, unless this is incompatible with the nature of the product or the defect.</li>
<li>The warranty does not cover damage caused by drops, liquid, misuse, unauthorised repair or normal wear.</li>
<li>To report a defect, contact us[[ ({{contact.email}})]][[ ({{contact.phone}})]] or via the <a href="/en/contact">contact form</a> with your order number.</li>
</ul>
<h2>8. B2B partnership and accounts</h2>
<ul>
<li>Partnership applications may be submitted by legal entities or individual entrepreneurs registered in Georgia. The applicant confirms that the information is accurate and that they may act on behalf of the company.</li>
<li>ASPOR reviews applications and may approve or reject them at its discretion.</li>
<li>After approval you receive a one-time link by email to set your password. Partners must keep their sign-in details confidential and are responsible for actions taken from their account.</li>
<li>ASPOR may suspend or close an account for breach of these terms, inaccurate information or termination of cooperation.</li>
</ul>
<h2>9. Wholesale prices</h2>
<ul>
<li>Wholesale prices are visible only to active partners after signing in, and apply to the partner’s online orders.</li>
<li>Wholesale prices are confidential commercial information. Partners must not publish them or pass them to third parties.</li>
<li>Prices may change without notice; changes do not affect orders already paid.</li>
</ul>
<h2>10. Product information</h2>
<p>We aim to keep descriptions, specifications and photos accurate. Colours or details in photos may differ slightly, and the manufacturer may change specifications.</p>
<h2>11. Intellectual property</h2>
<p>The ASPOR trademark, logo, site design, texts, photos and other materials are protected. They may not be copied, distributed or used commercially without ASPOR’s prior written consent. Active partners may use catalogue photos and descriptions solely to advertise and sell ASPOR products; ASPOR may withdraw this permission at any time.</p>
<h2>12. Prohibited conduct</h2>
<ul>
<li>bypassing or testing the Site’s security without permission;</li>
<li>automated bulk collection of data (scraping), including prices;</li>
<li>distributing malicious code or spam, or submitting orders or applications with false information;</li>
<li>using the Site in breach of Georgian law or the rights of third parties.</li>
</ul>
<h2>13. Limitation of liability</h2>
<p>We aim to keep the Site available and secure but cannot rule out temporary interruptions, maintenance or errors. To the extent permitted by law, ASPOR is not liable for indirect loss arising from the Site’s temporary unavailability. This does not limit consumers’ statutory rights.</p>
<h2>14. Force majeure</h2>
<p>Neither party is liable for failure to perform caused by force majeure (natural disaster, fire, war, state of emergency, decisions of public authorities, etc.) arising after the order was placed. Deadlines are extended accordingly, and the affected party must notify the other without delay.</p>
<h2>15. Personal data</h2>
<p>Processing of personal data is governed by the <a href="/en/privacy">Privacy policy</a> and the <a href="/en/cookies">Cookie policy</a>.</p>
<h2>16. Changes</h2>
<p>ASPOR may change these terms. Changes take effect when published on the Site and do not apply to orders already confirmed — those are governed by the version in force when the order was placed.</p>
<h2>17. Governing law and disputes</h2>
<p>These terms are governed by the laws of Georgia, including the Law of Georgia on Consumer Rights Protection. Disputes are resolved by negotiation and, failing agreement, by the common courts of Georgia.</p>
<h2>18. Contact</h2>
<p>[[Email: {{contact.email}}<br>]][[Phone: {{contact.phone}}<br>]][[Address: {{company.address}}<br>]]Contact form: <a href="/en/contact">aspor.ge/en/contact</a></p>`,
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
<p>BOG განვადების არჩევისას შეკვეთის გვერდზე იტვირთება Bank of Georgia-ს განვადების კალკულატორი (webstatic.bog.ge), ხოლო გადახდა სრულდება ბანკის გვერდზე — მათზე მოქმედებს ბანკის წესები.</p>
<h2>3. არჩევანის შეცვლა</h2>
<p>არჩევანის შეცვლა ნებისმიერ დროს შეგიძლიათ საიტის ქვედა ნაწილში ბმულით „Cookie პარამეტრები“. cookie-ების წაშლა ან დაბლოკვა ასევე შესაძლებელია ბრაუზერის პარამეტრებიდან; აუცილებელი cookie-ების დაბლოკვის შემთხვევაში ანგარიშში შესვლა ვერ იმუშავებს.</p>
<p>დამატებითი ინფორმაცია: <a href="/ka/privacy">კონფიდენციალურობის პოლიტიკა</a>. კითხვებისთვის: <a href="/ka/contact">საკონტაქტო ფორმა</a>[[ ან {{contact.email}}]].</p>`,
        `<p><em>Last updated: ${LEGAL_UPDATED}</em></p>
<p>A cookie is a small text file a website stores in your browser. aspor.ge uses only the cookies needed to run the Site, and analytics and marketing cookies only with your consent.</p>
<h2>1. Essential</h2>
<p>The Site (for example, partner sign-in) cannot work without these cookies, so they do not require consent.</p>
<table><tr><th>Cookie</th><th>Purpose</th><th>Duration</th></tr><tr><td>aspor_sid</td><td>Partner session (keeps you signed in)</td><td>30 days or until sign-out</td></tr><tr><td>aspor_admin_sid</td><td>Administrator session</td><td>12 h or until sign-out</td></tr><tr><td>aspor_consent</td><td>Remembers your cookie choice</td><td>180 days</td></tr><tr><td>NEXT_LOCALE</td><td>Language choice</td><td>Session</td></tr></table>
<h2>2. Analytics and marketing (consent only)</h2>
<table><tr><th>Cookie</th><th>Provider</th><th>Purpose</th></tr><tr><td>_ga, _ga_*</td><td>Google Analytics 4</td><td>Anonymous usage statistics</td></tr><tr><td>_fbp</td><td>Meta Pixel</td><td>Measuring advertising effectiveness</td></tr></table>
<p>These cookies load only after you choose “Accept all” on the banner. If you choose “Essential only”, they are not used. Their duration is set by the provider.</p>
<p>When you choose BOG installments, the checkout page loads Bank of Georgia’s installment calculator (webstatic.bog.ge), and payment is completed on the bank’s page — the bank’s own rules apply there.</p>
<h2>3. Changing your choice</h2>
<p>You can change your choice at any time via “Cookie settings” at the bottom of the Site. You can also delete or block cookies in your browser settings; if you block essential cookies, sign-in will not work.</p>
<p>More information: <a href="/en/privacy">Privacy policy</a>. Questions: <a href="/en/contact">contact form</a>[[ or {{contact.email}}]].</p>`,
      ),
    },
  },
];

export const LEGAL_PAGES = [
  { key: 'privacy', slug: 'privacy', titleKa: 'კონფიდენციალურობის პოლიტიკა', titleEn: 'Privacy policy', sections: PRIVACY_SECTIONS, seoKa: 'როგორ ამუშავებს ASPOR პერსონალურ მონაცემებს: რას ვაგროვებთ, რა მიზნით, ვის ვუზიარებთ და რა უფლებები გაქვთ.', seoEn: 'How ASPOR processes personal data: what we collect, why, who we share it with and your rights.' },
  { key: 'terms', slug: 'terms', titleKa: 'წესები და პირობები', titleEn: 'Terms and conditions', sections: TERMS_SECTIONS, seoKa: 'ონლაინ შეკვეთის, გადახდის, BOG განვადების, უფასო მიწოდების, 14-დღიანი დაბრუნებისა და გარანტიის წესები aspor.ge-ზე.', seoEn: 'Ordering, payment, BOG installments, free delivery, 14-day returns and warranty on aspor.ge.' },
  { key: 'cookies', slug: 'cookies', titleKa: 'Cookie პოლიტიკა', titleEn: 'Cookie policy', sections: COOKIE_SECTIONS, seoKa: 'რომელ cookie-ებს იყენებს aspor.ge და როგორ შეცვალოთ არჩევანი.', seoEn: 'Which cookies aspor.ge uses and how to change your choice.' },
] as const;
