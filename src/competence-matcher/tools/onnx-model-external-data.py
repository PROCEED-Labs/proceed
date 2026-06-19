import onnx
import argparse
import sys

# optimum-cli export onnx --model <model_name> <output_directory>

def main():
    parser = argparse.ArgumentParser(description="Convert ONNX model weights to external data format.")
    parser.add_argument('--input', '-i', required=True, help='Path to the input ONNX model')
    parser.add_argument('--output', '-o', required=False, help='Path to save the modified ONNX model (defaults to input path)', default=None)

    # If only -h/--help is present, show help and exit
    if len(sys.argv) == 2 and sys.argv[1] in ('-h', '--help'):
        parser.print_help()
        sys.exit(0)

    args = parser.parse_args()

    if args.output is None:
        args.output = args.input

    model = onnx.load(args.input)

    onnx.external_data_helper.convert_model_to_external_data(
        model,
        convert_attribute=True,
        all_tensors_to_one_file=True,
        location="model.onnx_data"
    )

    onnx.save(model, args.output)

if __name__ == "__main__":
    main()
