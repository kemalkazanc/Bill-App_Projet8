/**
 * @jest-environment jsdom
 */

import { fireEvent, screen, wait, within } from "@testing-library/dom"
import NewBillUI from "../views/NewBillUI.js"
import NewBill from "../containers/NewBill.js"
import mockStore from "../__mocks__/store"
import { localStorageMock } from "../__mocks__/localStorage.js"
import router from "../app/Router.js"
import { ROUTES_PATH, ROUTES } from "../constants/routes.js"
import { bills } from "../fixtures/bills.js"
import userEvent from "@testing-library/user-event"

// créer le mock pour l'api
jest.mock("../app/Store", () => mockStore) 

// pour écrire moins de code
// s'éxecute une fois pour tous
// setup du local storage et du user
beforeAll(() => {
  Object.defineProperty(window, "localStorage", { value: localStorageMock })
  window.localStorage.setItem("user",JSON.stringify({
      type: "Employee",
      email: "a@a"
    })
  )
})

// a exécuter avant chaque test
// permet d'initialiser la vue pour les test d'intégration
beforeEach(() => { 
  const root = document.createElement("div")
  root.setAttribute("id", "root")
  document.body.append(root)
  router()
  document.body.innerHTML = NewBillUI()
  window.onNavigate(ROUTES_PATH.NewBill)
})

// a éxecuter apres chaque test
// reset l'html du body pour éviter tout conflit
afterEach(() => { 
  document.body.innerHTML = ""
})

describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    test("Then mail icon in vertical layout should be highlighted", () => {

      const mailIcon = screen.getByTestId('icon-mail') 
      expect(mailIcon.classList.contains('active-icon')).toBe(true)
    })

    describe("When i fill the form with correct data", () => {
      test("Then there should be a submit button", () => {
        const submitButton = document.getElementById("btn-send-bill")
        expect(submitButton.innerHTML).toEqual("Envoyer")
      })

      describe("When i click on the submit button", () => {
        test("Then the data should be in the right format and i should get back on the bill page", async () => {
          const onNavigate = pathname => {
            document.body.innerHTML = ROUTES({ pathname })
          }
  
          const newBill = new NewBill({document, onNavigate, store: mockStore, localStorage: window.localStorage})
          
          // récupération de la fixture ainsi que tout les élements du dom necessaire
          const billFixture = bills[0]
          const form = screen.getByTestId("form-new-bill")
          const handleSubmit = jest.fn(newBill.handleSubmit)
          const fileSelect = screen.getByTestId("file")
          const file = new File(["img"], billFixture.fileName, {type: ["image/jpg"]})
          const select = screen.getByRole("combobox")
          const expense = screen.getByTestId("expense-name")
          const amount = screen.getByTestId("amount")
          const datepicker = screen.getByTestId("datepicker")
          const vat = screen.getByTestId("vat")
          const pct = screen.getByTestId("pct")
          const commentary = screen.getByTestId("commentary")
  
          // remplir les champs avec les données de fixtures
          userEvent.selectOptions(select, within(select).getByRole("option", { name: billFixture.type }))
          userEvent.type(expense, billFixture.name)
          userEvent.type(amount, billFixture.amount.toString())
          fireEvent.click(datepicker)
          await wait(() => {
            fireEvent.change(datepicker, {target: {value: billFixture.date}})
          })
          userEvent.type(vat, billFixture.vat.toString())
          userEvent.type(pct, billFixture.pct.toString())
          userEvent.type(commentary, billFixture.commentary)
          await userEvent.upload(fileSelect, file)
  
          // vérification du formulaire
          expect(select.value).toEqual(billFixture.type)
          expect(expense.value).toEqual(billFixture.name)
          expect(amount.value).toEqual( billFixture.amount.toString())
          expect(datepicker.value).toEqual(billFixture.date)
          expect(vat.value).toEqual(billFixture.vat.toString())
          expect(pct.value).toEqual(billFixture.pct.toString())
          expect(commentary.value).toEqual(billFixture.commentary)
  
          newBill.fileName = file.name
  
          form.addEventListener("submit", handleSubmit)
          fireEvent.submit(form)
  
          expect(handleSubmit).toHaveBeenCalled()
  
          // enfin vérification si l'on a bien changé de page
          expect(screen.getByText(/Mes notes de frais/i)).toBeTruthy()
        })

        test("Then a bill should be created", async () => {
          const createNewBill = jest.fn(mockStore.bills().create)
          const { fileUrl, key } = await createNewBill()

          expect(createNewBill).toHaveBeenCalled()
          expect(key).toEqual('1234')
          expect(fileUrl).toEqual('https://localhost:3456/images/test.jpg')
        })
      })
    })

    describe("When there isnt file name", () => {
      test("Then i should stay on the new bill page", async () => {
        const newBill = new NewBill({document, onNavigate, store: mockStore, localStorage: window.localStorage})

        // remplir le formulaire avec un fichier valide mais sans nom
        const billFixture = bills[0]
        const form = screen.getByTestId("form-new-bill")
        const handleSubmit = jest.fn(newBill.handleSubmit)
        const fileSelect = screen.getByTestId("file")
        const file = new File(["img"], null, {type: ["image/jpg"]})
        const select = screen.getByRole("combobox")
        const expense = screen.getByTestId("expense-name")
        const amount = screen.getByTestId("amount")
        const datepicker = screen.getByTestId("datepicker")
        const vat = screen.getByTestId("vat")
        const pct = screen.getByTestId("pct")
        const commentary = screen.getByTestId("commentary")
  

        // remplir le formulaire
        userEvent.selectOptions(select, within(select).getByRole("option", { name: billFixture.type }))
        userEvent.type(expense, billFixture.name)
        userEvent.type(amount, billFixture.amount.toString())
        fireEvent.click(datepicker)
        await wait(() => {
          fireEvent.change(datepicker, {target: {value: billFixture.date}})
        })
        userEvent.type(vat, billFixture.vat.toString())
        userEvent.type(pct, billFixture.pct.toString())
        userEvent.type(commentary, billFixture.commentary)
        await userEvent.upload(fileSelect, file)
        newBill.fileName = file.name

        // vérifier que le formulaire est rempli
        expect(amount.value).toEqual( billFixture.amount.toString())
  
        // submit le formulaire
        const pageTitle = document.querySelector('.content-title')
        form.addEventListener("submit", handleSubmit)
        fireEvent.submit(form)

        expect(handleSubmit).toHaveBeenCalled()
        expect(pageTitle).toBeTruthy()
      })
    })
    
    describe("When i do not fill some input", () => {
      test("Then i should still be on the new bill page", () => {
        
        const newBill = new NewBill({
          document, onNavigate, store: mockStore, localStorage: window.localStorage
        })
        const form = screen.getByTestId("form-new-bill")
        const handleSubmit = jest.fn(newBill.handleSubmit)

        form.addEventListener("submit", handleSubmit)
        fireEvent.submit(form)
        
        const pageTitle = document.querySelector('.content-title')

        expect(handleSubmit).toHaveBeenCalled()
        expect(pageTitle).toBeTruthy()
      })
    })

    describe("When the file type isnt jpg, jpeg or png ", () => {
      test("Then i should stay on the new bill page", async () => {

        const newBill = new NewBill({
          document, onNavigate, store: mockStore, localStorage: window.localStorage
        })

        // créer un fichier avec un type qui ne correspond pas
        const form = screen.getByTestId("form-new-bill")
        const handleSubmit = jest.fn(newBill.handleSubmit)
        const fileSelect = screen.getByTestId("file")
        const file = new File(["foo"], "foo.txt", {type: ["text/plain"]})

        // upload le fichier
        await userEvent.upload(fileSelect, file)

        // submit le formulaire
        const pageTitle = document.querySelector('.content-title')
        form.addEventListener("submit", handleSubmit)
        fireEvent.submit(form)

        expect(handleSubmit).toHaveBeenCalled()
        expect(pageTitle).toBeTruthy()
      })
    })

    describe("When i create a new bill and an error occurs on API", () => {
      test("Then it fail with 404 message error", async () => {
        jest.spyOn(mockStore, "bills")

        const newBill = new NewBill({
          document, onNavigate, store: mockStore, localStorage: window.localStorage
        })

        const billError = mockStore.bills.mockImplementationOnce(() => {
          return {
            create : () => {
              return Promise.reject(new Error("Erreur 404"))
            }
          }
        })
        await expect(billError().create).rejects.toThrow("Erreur 404")
        expect(billError).toHaveBeenCalled
        expect(newBill.billId).toBeNull()
      })

      test("Then it fails with 500 message error", async () => {
        jest.spyOn(mockStore, "bills")

        const newBill = new NewBill({
          document, onNavigate, store: mockStore, localStorage: window.localStorage
        })

        const billError = mockStore.bills.mockImplementationOnce(() => {
          return {
            create : () => {
              return Promise.reject(new Error("Erreur 500"))
            }
          }
        })
        await expect(billError().create).rejects.toThrow("Erreur 500")
        expect(billError).toHaveBeenCalled
        expect(newBill.billId).toBeNull()
      })
    })
  })
})
