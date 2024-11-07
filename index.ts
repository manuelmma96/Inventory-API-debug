//Asegurar que el programa explique correctamente el error al cliente *Suficientemente descriptivo*
//Para esto asegúrate de agregar las validaciones necesarias y que sean suficientemente descriptivas desde cuando funciona o da error. 
//Mantener un standard

/*   AJUSTES:
Se mantuvo el type intacto junto con el "unknown".
No se pudo hacer la función de generarID único debido a la naturaleza de la ruta "Post By ID" para esto manejamos las entradas con las siguientes funciones:
Función para validar entradas de ID "isValidId".
Función para validar que el ID sea único "validateUniqueId".
Función para validar el tipo de valores que storedItem puede recibir y almacenar.
Establecimos una constante para expectedTypes en caso de que el cliente quiera manejar otro tipo de valores o agregar nuevas propiedades en el futuro pero manteniendo la lógica existente.
Las funciones tienen sus respectivas validaciones para simplificar el uso de los endpoints.
Se agrego un método de PUT para modificar items por ID con sus respectivas validaciones.
Se arreglo el endpoint de Delete para que pueda retornar un status response y no se quede colgado de manera indefinida.
*/

/*
Observaciones: 

1- Const expectedTypes record <string, string> le pasa por arriba (overrides) al propósito del "unknown". Lo ideal seria expandirlo a otro tipo de types.
2- La lógica que se utilizo para la ruta de post donde usamos las funciones para manejar las validaciones debería replicarse en el método PUT para mantener el standard.
3- Hay una inconsistencia en el manejo de status error donde en el método POST se usa el status res 201 y en el put el 200. lo Ideal seria estandarizar tus responses para consistencia.
Extra:  Considera implementar alguna especie de lock para prevenir que se realicen multiples intentos de POST o manejar concurrencias de entradas.


*/

import express, { Request, Response } from "express";

type StoredItem = Record<string, unknown> & { id: string };

let storage: StoredItem[] = [];

const app = express();
app.use(express.json());

//Constant for expected types. If you want the storedItem record to receive a different type of value or add a new property, PLEASE ADD THEM HERE!.
const expectedTypes: Record<string, string> = {
  name: "string",
  description: "string",
  price: "number",
};


// Function to validate if the ID is a positive integer, greater than 0, and within character limits
function isValidId(id: string): { isValid: boolean; error?: string } {
  const maxIdLength = 6; //If you want adjust the character limit for the ID's you can manually adjust them here. For ex: const maxIdLength = 10 for ID's with 10 character limit etc..

  if (!/^[1-9]\d*$/.test(id)) {
    return {
      isValid: false,
      error: "ID must be a positive integer greater than zero.",
    };
  }

  if (id.length > maxIdLength) {
    return {
      isValid: false,
      error: `ID cannot exceed ${maxIdLength} characters.`,
    };
  }

  return { isValid: true };
}

//Function to validate ID uniqueness
function validateUniqueId(id: string): { isValid: boolean; error?: string } {
  const { isValid, error } = isValidId(id);
  if (!isValid) {
    return { isValid: false, error }; 
  }

  if (storage.some(item => item.id === id)) {
    return {
      isValid: false,
      error: "ID already exists. Please provide a unique ID.",
    };
  }

  return { isValid: true };
}

//Function to validate the type of values StoredItem can receive
function validateStoredItem(data: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const [key, type] of Object.entries(expectedTypes)) {
    if (data[key] !== undefined && typeof data[key] !== type) {
      errors.push(`Invalid type for '${key}'. Expected ${type} but received ${typeof data[key]}. Please ensure the ${key} is of type ${type}.`);
    }
  }

  const extraFields = Object.keys(data).filter((key) => !(key in expectedTypes));
  if (extraFields.length > 0) {
    errors.push(
      `Unrecognized fields provided: ${extraFields.join(", ")}. Please remove these fields as they are not expected. Allowed fields are: ${Object.keys(expectedTypes).join(", ")}.`
    );
  }

  return { valid: errors.length === 0, errors };
}

//Get all items
app.get("/items", (req: Request, res: Response) => {
  if (storage.length === 0) {
    res.status(200).json({
      message: "No items found in the inventory. Add items to see them listed here.",
      items: [],
    });
  } else {
    res.json(storage);
  }
});

//Get item by ID
app.get("/item/:id", (req: Request, res: Response) => {
  console.info(req.params.id);
  const item = storage.find((item) => item.id === req.params.id);

  if (!item) {
    res.status(404).json({ error: "Item not found. Please check the provided ID or verify if the item exists." });
    return;
  }

  res.json(item);
});

//Post a new item by ID
app.post("/item/:id", (req: Request, res: Response) => {
  const id = req.params.id;

  const { isValid, error } = validateUniqueId(id);
  if (!isValid) {
    res.status(400).json({
      error, 
    });
    return;
  }

  const { valid, errors } = validateStoredItem(req.body);
  if (!valid) {
    res.status(400).json({
      error: "Invalid input. Ensure all fields are correctly formatted.",
      details: errors,
    });
    return;
  }

  const newStoredItem: StoredItem = {
    id,
    name: req.body.name,
    description: req.body.description,
    price: req.body.price,
  };

  storage.push(newStoredItem);

  res.status(201).json({
    message: "Item created successfully",
    item: newStoredItem,
  });
});

//Modify an existing item by ID
app.put("/item/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const itemIndex = storage.findIndex((item) => item.id === id);

  if (itemIndex === -1) {
    res.status(404).json({ error: "Item not found. Please verify the item ID to modify an existing item." });
    return;
  }

  const existingItem = storage[itemIndex];

  const updatedItem: StoredItem = {
    id: existingItem.id, 
    name: req.body.name !== undefined ? req.body.name : existingItem.name,
    description: req.body.description !== undefined ? req.body.description : existingItem.description,
    price: req.body.price !== undefined ? req.body.price : existingItem.price
  };

  storage[itemIndex] = updatedItem;

  res.status(200).json(updatedItem);
});

//Delete an existing item by ID
app.delete("/item/:id", (req: Request, res: Response) => {
  const selectedIndex = storage.findIndex(i => i.id === req.params.id);

  if (selectedIndex !== -1) {
    const [deletedItem] = storage.splice(selectedIndex, 1);
    console.info(JSON.stringify(deletedItem, null, 2));
    res.status(200).json({
      message: `Item with ID '${req.params.id}' deleted successfully.`,
      item: deletedItem,
    });

  } else {
    res.status(404).json({
      error: "Unable to delete: Item not found. Verify the item ID and try again.",
    });
  }
});


app.listen(8081, () => {
  console.log("Running on port 8081");
});