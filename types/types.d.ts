export type StringKeyedObject = {
  [key: string]: string | number | boolean;
};

export type FieldMap = Map<
  string,
  { name: string; type: "string" | "number" | "boolean" }
>;

export type ListTableDataItem = {
  [key: string]: string;
};

export type ListTableData = ListTableDataItem[];
