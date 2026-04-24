import pandas as pd
import json
import sys

file_path = '/Users/manoelgoncalo/Downloads/sc846140.xlsx'

try:
    # Read without headers to see where they are
    df = pd.read_excel(file_path, header=None)
    result = {
        "rows": df.head(50).values.tolist()
    }
    print(json.dumps(result, indent=2, default=str))
except Exception as e:
    print(f"Error: {str(e)}")
    sys.exit(1)
